# Friend Request Notification Backend Migration Plan

## Overview
Move friend request and friend accepted notifications from client-side (FriendsProvider.tsx) to backend (Supabase Edge Function), following the same pattern used for message notifications.

## Background Context

### Current Implementation
- **Location**: `src/utilities/FriendsProvider.tsx`
- **Two notification types**:
  1. `friend_request` - Sent when user creates a new friend request (line 259-268)
  2. `friend_accepted` - Sent when user accepts a friend request (line 312-321)
- **Function used**: `sendPushNotification()` from `src/utilities/Onesignal.tsx`
- **Non-blocking**: Notifications wrapped in `.catch()` to prevent blocking main operations

### Database Schema
**Table**: `friendships`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `requester_id` | String (UUID) | User who initiated the request |
| `addressee_id` | String (UUID) | User receiving the request |
| `status` | Enum | `pending`, `accepted`, `rejected`, `blocked` |
| `created_at` | Timestamp | When record was created |
| `updated_at` | Timestamp | When record was last modified |

**Key constraint**: UNIQUE on `(requester_id, addressee_id)`

### Notification Details

**Friend Request Notification** (when status becomes `pending`):
- **Recipient**: `addressee_id` (person receiving the request)
- **Title**: Sender's name
- **Message**: "Sent you a friend request"
- **Data**: `notificationType: 'friend_request'`

**Friend Accepted Notification** (when status changes to `accepted`):
- **Recipient**: `requester_id` (original requester)
- **Title**: Accepter's name
- **Message**: "Accepted your friend request"
- **Data**: `notificationType: 'friend_accepted'`

## Implementation Plan

### Phase 1: Create Edge Function

**File**: `supabase/functions/send-friend-request-notification/index.ts`

#### 1.1 Edge Function Structure
```typescript
interface FriendshipPayload {
  type: "INSERT" | "UPDATE";
  table: "friendships";
  schema: "public";
  record: {
    id: string;
    requester_id: string;
    addressee_id: string;
    status: "pending" | "accepted" | "rejected" | "blocked";
    created_at: string;
    updated_at: string;
  };
  old_record: {
    status?: string;
  } | null;
}
```

#### 1.2 Logic Flow

**Step 1: Determine Notification Type and Participants**
```typescript
let notificationType: 'friend_request' | 'friend_accepted' | null = null;
let senderId: string;
let recipientId: string;

if (payload.type === 'INSERT' && payload.record.status === 'pending') {
  // New friend request
  notificationType = 'friend_request';
  senderId = payload.record.requester_id;
  recipientId = payload.record.addressee_id;
} else if (payload.type === 'UPDATE') {
  const oldStatus = payload.old_record?.status;
  const newStatus = payload.record.status;

  if (newStatus === 'pending' && oldStatus && ['rejected', 'blocked'].includes(oldStatus)) {
    // Re-send after rejection or unblock
    notificationType = 'friend_request';
    senderId = payload.record.requester_id;
    recipientId = payload.record.addressee_id;
  } else if (newStatus === 'accepted' && oldStatus !== 'accepted') {
    // Friend request accepted
    notificationType = 'friend_accepted';
    senderId = payload.record.addressee_id;  // Person who accepted
    recipientId = payload.record.requester_id;  // Original requester
  }
}

// Skip if no notification needed
if (!notificationType) {
  console.log('⏭️ Skipping notification - not a notifiable event');
  return new Response(
    JSON.stringify({ success: true, skipped: 'No notification required' }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
}

console.log(`📨 Processing ${payload.type} event:`, {
  notificationType,
  friendshipId: payload.record.id,
  oldStatus: payload.old_record?.status,
  newStatus: payload.record.status,
});
```

**Step 2: Fetch Sender Profile**
```typescript
const { data: senderProfile } = await supabase
  .from("profiles")
  .select("uid, name, profilePicture")
  .eq("uid", senderId)
  .single();
```

**Step 3: Send OneSignal Notification**
```typescript
{
  app_id: oneSignalAppId,
  target_channel: "push",
  include_external_user_ids: [recipientId],
  headings: { en: senderProfile.name },
  contents: { en: notificationType === 'friend_request'
    ? "Sent you a friend request"
    : "Accepted your friend request"
  },
  data: {
    fromName: senderProfile.name,
    fromPhoto: senderProfile.profilePicture,
    notificationType: notificationType,  // 'friend_request' or 'friend_accepted'
    friendshipId: payload.record.id,
  },
  large_icon: senderProfile.profilePicture,
  ios_badgeType: "Increase",
  ios_badgeCount: 1,
  ios_sound: "default",
  android_sound: "default",
  priority: 10,
  content_available: true,
}
```

**Step 4: Error Handling**
- Always return HTTP 200 to prevent webhook retries
- Log errors to console with emoji indicators
- Handle missing profiles gracefully
- Handle OneSignal API errors with detailed logging

#### 1.3 Environment Variables
Reuse existing secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ONESIGNAL_APP_ID`
- `ONESIGNAL_REST_API_KEY`

### Phase 2: Create Database Trigger

**File**: `setup_friend_notification_trigger.sql` (run manually in Supabase SQL Editor)

#### 2.1 Trigger Function
```sql
CREATE OR REPLACE FUNCTION trigger_send_friend_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  request_id bigint;
  payload jsonb;
  should_notify boolean := false;
BEGIN
  -- Determine if we should send a notification
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- New friend request
    should_notify := true;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Friend request accepted
    IF NEW.status = 'accepted' AND OLD.status != 'accepted' THEN
      should_notify := true;
    -- Re-send after rejection or unblock
    ELSIF NEW.status = 'pending' AND OLD.status IN ('rejected', 'blocked') THEN
      should_notify := true;
    END IF;
  END IF;

  -- Only proceed if we need to notify
  IF should_notify THEN
    -- Build the payload
    payload := jsonb_build_object(
      'type', TG_OP,
      'table', 'friendships',
      'schema', 'public',
      'record', row_to_json(NEW),
      'old_record', CASE WHEN TG_OP = 'UPDATE' THEN row_to_json(OLD) ELSE NULL END
    );

    -- Call the edge function via pg_net
    SELECT net.http_post(
      url := 'https://ifmwepbepoujfnzisrjz.supabase.co/functions/v1/send-friend-request-notification',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer <SUPABASE_ANON_KEY>'
      ),
      body := payload
    ) INTO request_id;

    RAISE NOTICE 'Triggered friend notification for friendship %, request_id: %', NEW.id, request_id;
  END IF;

  RETURN NEW;
END;
$$;
```

#### 2.2 Trigger Creation
```sql
-- Enable the pg_net extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_friendship_event ON friendships;

-- Create the trigger on the friendships table
CREATE TRIGGER on_friendship_event
  AFTER INSERT OR UPDATE ON friendships
  FOR EACH ROW
  EXECUTE FUNCTION trigger_send_friend_notification();
```

### Phase 3: Update Frontend Code

**File**: `src/utilities/FriendsProvider.tsx`

#### 3.1 Remove Notification Calls

**Remove from `sendFriendRequest()` function** (lines 259-268):
```typescript
// DELETE THIS BLOCK:
sendPushNotification(
  foundUser.uid,
  profile.name,
  profile.profilePicture,
  '',
  '',
  'friend_request'
).catch((error) => {
  console.warn("⚠️ Failed to send friend request notification:", error);
});
```

**Remove from `acceptFriendRequest()` function** (lines 312-321):
```typescript
// DELETE THIS BLOCK:
sendPushNotification(
  friendRequest.requester_id,
  profile.name,
  profile.profilePicture,
  '',
  '',
  'friend_accepted'
).catch((error) => {
  console.warn("⚠️ Failed to send friend accepted notification:", error);
});
```

#### 3.2 Clean Up Imports
Check if `sendPushNotification` is still used elsewhere in FriendsProvider.tsx:
- If not, remove the import: `import { sendPushNotification } from "./Onesignal";`
- Keep `Onesignal.tsx` file intact as it's still used by `testNotifications.ts`

### Phase 4: Deploy and Test

#### 4.1 Deploy Edge Function
```bash
npx supabase functions deploy send-friend-request-notification
```

#### 4.2 Set Up Database Trigger
1. Navigate to Supabase SQL Editor: https://supabase.com/dashboard/project/ifmwepbepoujfnzisrjz/sql/new
2. Copy contents of `setup_friend_notification_trigger.sql`
3. Replace `<SUPABASE_ANON_KEY>` with actual anon key
4. Run the SQL
5. Verify trigger was created successfully

#### 4.3 Test Scenarios

**Test 1: Send Friend Request**
1. User A sends friend request to User B
2. Verify User B receives notification: "User A sent you a friend request"
3. Check edge function logs for successful execution

**Test 2: Accept Friend Request**
1. User B accepts friend request from User A
2. Verify User A receives notification: "User B accepted your friend request"
3. Check edge function logs for successful execution

**Test 3: Re-send After Rejection**
1. User A sends friend request to User B → User B rejects
2. User A sends friend request again (re-send)
3. Verify User B receives new notification: "User A sent you a friend request"
4. Check edge function logs for UPDATE with old_status='rejected', new_status='pending'

**Test 4: Unblock and Re-request**
1. User A blocks User B
2. User A unblocks and sends friend request to User B
3. Verify User B receives notification: "User A sent you a friend request"
4. Check edge function logs for UPDATE with old_status='blocked', new_status='pending'

**Test 5: Edge Cases (No Notifications)**
- Reject friend request → No notification (verify silence)
- Block user → No notification (verify silence)
- Already accepted friendship → No duplicate notification on re-update
- Cancel request → No notification (verify silence)

#### 4.4 Monitoring
Check edge function logs in Supabase Dashboard:
https://supabase.com/dashboard/project/ifmwepbepoujfnzisrjz/functions/send-friend-request-notification

Look for:
- ✅ Success messages with notification IDs
- ❌ Error messages if OneSignal API fails
- ⚠️ Warnings for missing profiles or edge cases

## Critical Files

### Files to Create
1. `supabase/functions/send-friend-request-notification/index.ts` - New edge function
2. `setup_friend_notification_trigger.sql` - SQL script for trigger (run manually)

### Files to Modify
1. `src/utilities/FriendsProvider.tsx` - Remove notification calls (lines 259-268, 312-321)

### Files to Reference (No Changes)
1. `supabase/functions/send-message-notification/index.ts` - Template for edge function structure
2. `src/utilities/Onesignal.tsx` - Keep for reference, still used by testNotifications.ts
3. `src/objects/FriendRequest.tsx` - Reference for status types

## Potential Issues & Solutions

### Issue 1: Re-send Scenarios Not Triggering Notifications
**Problem**: When user re-sends a rejected request or sends a request after unblocking, the database performs an UPDATE (not INSERT), which might not trigger notification
**Solution**: ✅ Trigger handles UPDATE events where status changes from 'rejected'/'blocked' to 'pending'

### Issue 2: Duplicate Notifications on No-op Updates
**Problem**: If status is updated from 'accepted' to 'accepted' (no-op), trigger might fire unnecessarily
**Solution**: ✅ Trigger checks `OLD.status != 'accepted'` to prevent duplicate notifications

### Issue 3: Trigger Fires Too Often
**Problem**: Trigger fires on ALL updates, including status changes to 'rejected' or 'blocked'
**Solution**: ✅ Conditional logic in trigger function only calls edge function when `should_notify = true`

### Issue 4: Duplicate Notifications During Migration
**Problem**: User might get notified twice if frontend and backend both send
**Solution**: Remove frontend notification calls AFTER confirming backend works in testing

### Issue 5: Missing Profile Data
**Problem**: Sender's profile might not exist or be incomplete
**Solution**: Edge function returns early with 200 status if profile fetch fails (logged as error)

### Issue 6: OneSignal API Rate Limiting
**Problem**: High volume of friend requests could hit OneSignal rate limits
**Solution**: Monitor edge function logs; OneSignal free tier supports 10,000 notifications/month

## Success Criteria

- ✅ Edge function deployed successfully
- ✅ Database trigger created and active
- ✅ Friend request notifications arrive on mobile/web
- ✅ Friend accepted notifications arrive on mobile/web
- ✅ Re-send scenarios work correctly (rejected → pending, blocked → pending)
- ✅ No notifications for reject/block/cancel actions
- ✅ No duplicate notifications on no-op updates
- ✅ Frontend code cleaned up (notification calls removed)
- ✅ No TypeScript errors
- ✅ Edge function logs show successful executions

## Rollback Plan

If issues occur:
1. Keep edge function deployed (no harm if not called)
2. Drop the database trigger: `DROP TRIGGER on_friendship_event ON friendships;`
3. Revert frontend changes to restore client-side notifications
4. Investigate and fix issues before re-enabling

## Estimated Effort

- **Edge Function Creation**: 15 minutes
- **Database Trigger Setup**: 10 minutes
- **Frontend Cleanup**: 5 minutes
- **Testing**: 15 minutes
- **Total**: ~45 minutes
