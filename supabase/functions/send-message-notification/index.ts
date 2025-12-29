/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

interface MessagePayload {
  type: "INSERT";
  table: "messages";
  schema: "public";
  record: {
    messageId: string;
    timestamp: string;
    uid: string;
    audioUrl: string;
    isRead: boolean;
  };
  old_record: null;
}

Deno.serve(async (req) => {
  try {
    // Parse webhook payload
    const payload: MessagePayload = await req.json();
    const newMessage = payload.record;

    console.log("📨 Processing new message:", newMessage.messageId);

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Step 1: Get sender's profile
    const { data: senderProfile, error: senderError } = await supabase
      .from("profiles")
      .select("uid, name, profilePicture")
      .eq("uid", newMessage.uid)
      .single();

    if (senderError || !senderProfile) {
      console.error("❌ Failed to fetch sender profile:", senderError);
      // Return 200 anyway so webhook doesn't retry
      return new Response(
        JSON.stringify({ error: "Sender profile not found" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 2: Find conversation containing this message
    const { data: conversations, error: convError } = await supabase
      .from("conversations")
      .select("conversationId, uids")
      .contains("messages", [newMessage.messageId]);

    if (convError || !conversations || conversations.length === 0) {
      console.error("❌ Failed to find conversation:", convError);
      // Return 200 anyway so webhook doesn't retry
      return new Response(JSON.stringify({ error: "Conversation not found" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const conversation = conversations[0];

    // Step 3: Determine recipient UID
    const recipientUid = conversation.uids.find(
      (uid: string) => uid !== newMessage.uid
    );

    if (!recipientUid) {
      console.log("⚠️ No recipient found (single-user conversation?)");
      return new Response(
        JSON.stringify({ success: true, skipped: "No recipient" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Step 4: Send push notification via OneSignal REST API
    const oneSignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const oneSignalRestApiKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    if (!oneSignalAppId || !oneSignalRestApiKey) {
      console.error("❌ OneSignal credentials not configured");
      return new Response(
        JSON.stringify({ error: "OneSignal credentials not configured" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    const notificationResponse = await fetch(
      "https://api.onesignal.com/notifications",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Key ${oneSignalRestApiKey}`,
        },
        body: JSON.stringify({
          app_id: oneSignalAppId,
          target_channel: "push",
          include_external_user_ids: [recipientUid],
          headings: { en: senderProfile.name },
          contents: { en: "Sent you a voice message" },
          data: {
            conversationId: conversation.conversationId,
            messageUrl: newMessage.audioUrl,
            messageId: newMessage.messageId,
            fromName: senderProfile.name,
            fromPhoto: senderProfile.profilePicture,
            notificationType: "message",
          },
          large_icon: senderProfile.profilePicture,
          ios_badgeType: "Increase",
          ios_badgeCount: 1,
          ios_sound: "default",
          android_sound: "default",
          priority: 10,
          content_available: true,
        }),
      }
    );

    const result = await notificationResponse.json();

    if (!notificationResponse.ok) {
      console.error("❌ OneSignal API error:", result);
      // Return 200 anyway so webhook doesn't retry
      return new Response(
        JSON.stringify({ error: "OneSignal API error", details: result }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log("✅ Push notification sent successfully:", result.id);

    return new Response(
      JSON.stringify({ success: true, notificationId: result.id }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Edge function error:", error);
    // Return 200 anyway so webhook doesn't retry
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});
