# Message Caching Implementation Plan

> **FOR AI AGENTS:** This plan is designed for AI-assisted implementation. Each section contains:
>
> - ✅ **WHAT to build** - Clear specifications
> - 🎯 **WHY it's needed** - Context and reasoning
> - 📝 **HOW to implement** - Step-by-step instructions
> - 🧪 **WHAT to test** - Comprehensive test requirements at the end of each phase

## Executive Summary

This plan adds offline-first message caching to the HeyJ app to improve performance and user experience. The app currently downloads all messages on every startup, which is inefficient. This implementation will:

1. **Cache recent conversations** (last 20) in SQLite
2. **Show cached data immediately** on app startup
3. **Sync in background** to fetch updates
4. **Queue offline messages** for sending when connection restores

**EXPECTED OUTCOME:** App startup becomes ~90% faster with instant message display from cache, full offline support for viewing and queueing messages.

## Current Architecture Analysis

### Message Flow (Current)
```
App Opens
  ↓
Auth Check (ProfileProvider)
  ↓
Fetch Profile from Supabase
  ↓
Fetch ALL Conversations (ConversationsProvider.getConversations)
  ↓
For each conversation:
  - Fetch conversation metadata
  - Call Conversation.fromJSON()
  - Parallel fetch ALL messages for that conversation
  ↓
Set up real-time subscriptions
  ↓
Display UI
```

**Performance Issues:**
- No local persistence (except AsyncStorage for settings)
- Every app open = full download of all conversations + messages
- Network-dependent startup (slow on poor connections)
- No offline message sending capability

### Key Files

| File | Purpose | Lines of Interest |
|------|---------|-------------------|
| [src/utilities/ConversationsProvider.tsx](src/utilities/ConversationsProvider.tsx) | Manages conversation state | 51-131 (getConversations), 199-296 (real-time subscriptions) |
| [src/objects/Conversation.tsx](src/objects/Conversation.tsx) | Conversation model | 33-59 (fromJSON with message fetching) |
| [src/utilities/SendMessage.tsx](src/utilities/SendMessage.tsx) | Message sending | Entire file (needs offline queue integration) |
| [src/services/audioService.ts](src/services/audioService.ts) | Audio download/cache | Uses expo-file-system cache |

---

## Implementation Plan

### Phase 1: Database Layer (Foundation)

#### 1.1 Install Dependencies

```bash
npx expo install expo-sqlite
```

#### 1.2 Create SQLite Database Schema

**New File:** `src/database/schema.ts`

```typescript
export const DATABASE_NAME = 'heyj.db';
export const DATABASE_VERSION = 1;

export const SCHEMA = {
  // Core tables
  CONVERSATIONS: `
    CREATE TABLE IF NOT EXISTS conversations (
      conversationId TEXT PRIMARY KEY,
      uids TEXT NOT NULL,
      lastRead TEXT,
      lastMessageTimestamp INTEGER,
      syncedAt INTEGER NOT NULL,
      isCached INTEGER DEFAULT 1
    );
  `,

  MESSAGES: `
    CREATE TABLE IF NOT EXISTS messages (
      messageId TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      uid TEXT NOT NULL,
      audioUrl TEXT NOT NULL,
      isRead INTEGER NOT NULL,
      syncedAt INTEGER NOT NULL,
      FOREIGN KEY (conversationId) REFERENCES conversations(conversationId) ON DELETE CASCADE
    );
  `,

  PROFILES_CACHE: `
    CREATE TABLE IF NOT EXISTS profiles_cache (
      uid TEXT PRIMARY KEY,
      profilePicture TEXT,
      name TEXT,
      email TEXT,
      userCode TEXT,
      syncedAt INTEGER NOT NULL
    );
  `,

  // Offline message queue
  PENDING_MESSAGES: `
    CREATE TABLE IF NOT EXISTS pending_messages (
      localId TEXT PRIMARY KEY,
      conversationId TEXT NOT NULL,
      audioUri TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      retryCount INTEGER DEFAULT 0,
      lastError TEXT,
      status TEXT DEFAULT 'pending'
    );
  `,

  // Metadata table for tracking sync state
  SYNC_METADATA: `
    CREATE TABLE IF NOT EXISTS sync_metadata (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt INTEGER NOT NULL
    );
  `,

  // Indexes for performance
  INDEXES: [
    'CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversationId);',
    'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC);',
    'CREATE INDEX IF NOT EXISTS idx_conversations_lastMessage ON conversations(lastMessageTimestamp DESC);',
    'CREATE INDEX IF NOT EXISTS idx_pending_messages_status ON pending_messages(status);',
  ],
};
```

**Design Decisions:**
- `isCached` flag: Marks which conversations are in the "recent 20" cache
- `syncedAt` timestamps: Track when data was last synced for staleness checks
- `INTEGER` for booleans/dates: SQLite doesn't have native boolean/date types
- Indexes on `conversationId` and `timestamp`: Optimize common queries
- `PENDING_MESSAGES`: Queue for offline message sending

#### 1.3 Create Database Service

**New File:** `src/database/database.ts`

```typescript
import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, DATABASE_VERSION, SCHEMA } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export const initDatabase = async (): Promise<void> => {
  try {
    if (db) {
      console.log('📦 Database already initialized');
      return;
    }

    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    console.log('📦 Database opened successfully');

    // Create tables
    await db.execAsync(SCHEMA.CONVERSATIONS);
    await db.execAsync(SCHEMA.MESSAGES);
    await db.execAsync(SCHEMA.PROFILES_CACHE);
    await db.execAsync(SCHEMA.PENDING_MESSAGES);
    await db.execAsync(SCHEMA.SYNC_METADATA);

    // Create indexes
    for (const index of SCHEMA.INDEXES) {
      await db.execAsync(index);
    }

    console.log('✅ Database schema created');

    // Set database version
    await setSyncMetadata('db_version', DATABASE_VERSION.toString());
  } catch (error) {
    console.error('❌ Error initializing database:', error);
    throw error;
  }
};

export const getDatabase = (): SQLite.SQLiteDatabase => {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
};

export const closeDatabase = async (): Promise<void> => {
  if (db) {
    await db.closeAsync();
    db = null;
    console.log('📦 Database closed');
  }
};

// Metadata helpers
export const setSyncMetadata = async (key: string, value: string): Promise<void> => {
  const database = getDatabase();
  await database.runAsync(
    'INSERT OR REPLACE INTO sync_metadata (key, value, updatedAt) VALUES (?, ?, ?)',
    [key, value, Date.now()]
  );
};

export const getSyncMetadata = async (key: string): Promise<string | null> => {
  const database = getDatabase();
  const result = await database.getFirstAsync<{ value: string }>(
    'SELECT value FROM sync_metadata WHERE key = ?',
    [key]
  );
  return result?.value || null;
};
```

#### 1.4 Create Conversation Repository

**New File:** `src/database/repositories/conversationRepository.ts`

```typescript
import { getDatabase } from '../database';
import Conversation from '@objects/Conversation';
import Message from '@objects/Message';

export const saveConversation = async (conversation: Conversation): Promise<void> => {
  const db = getDatabase();
  const now = Date.now();

  // Calculate last message timestamp
  const lastMessageTimestamp = conversation.messages.length > 0
    ? Math.max(...conversation.messages.map(m => m.timestamp.getTime()))
    : 0;

  await db.runAsync(
    `INSERT OR REPLACE INTO conversations
     (conversationId, uids, lastRead, lastMessageTimestamp, syncedAt, isCached)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      conversation.conversationId,
      JSON.stringify(conversation.uids),
      JSON.stringify(conversation.lastRead),
      lastMessageTimestamp,
      now,
      1, // Mark as cached
    ]
  );

  // Save all messages for this conversation
  for (const message of conversation.messages) {
    await saveMessage(message, conversation.conversationId);
  }
};

export const saveMessage = async (message: Message, conversationId: string): Promise<void> => {
  const db = getDatabase();
  const now = Date.now();

  await db.runAsync(
    `INSERT OR REPLACE INTO messages
     (messageId, conversationId, timestamp, uid, audioUrl, isRead, syncedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      message.messageId,
      conversationId,
      message.timestamp.getTime(),
      message.uid,
      message.audioUrl,
      message.isRead ? 1 : 0,
      now,
    ]
  );
};

export const getRecentConversations = async (limit: number = 20): Promise<Conversation[]> => {
  const db = getDatabase();

  const conversationRows = await db.getAllAsync<{
    conversationId: string;
    uids: string;
    lastRead: string;
  }>(
    `SELECT conversationId, uids, lastRead
     FROM conversations
     WHERE isCached = 1
     ORDER BY lastMessageTimestamp DESC
     LIMIT ?`,
    [limit]
  );

  const conversations: Conversation[] = [];

  for (const row of conversationRows) {
    const messages = await getMessagesForConversation(row.conversationId);

    conversations.push(
      new Conversation(
        row.conversationId,
        JSON.parse(row.uids),
        messages,
        JSON.parse(row.lastRead)
      )
    );
  }

  return conversations;
};

export const getMessagesForConversation = async (conversationId: string): Promise<Message[]> => {
  const db = getDatabase();

  const messageRows = await db.getAllAsync<{
    messageId: string;
    timestamp: number;
    uid: string;
    audioUrl: string;
    isRead: number;
  }>(
    `SELECT messageId, timestamp, uid, audioUrl, isRead
     FROM messages
     WHERE conversationId = ?
     ORDER BY timestamp ASC`,
    [conversationId]
  );

  return messageRows.map(row =>
    new Message(
      row.messageId,
      new Date(row.timestamp),
      row.uid,
      row.audioUrl,
      row.isRead === 1
    )
  );
};

export const updateRecentConversationsList = async (
  conversationIds: string[]
): Promise<void> => {
  const db = getDatabase();

  // Mark all as not cached
  await db.runAsync('UPDATE conversations SET isCached = 0');

  // Mark only recent ones as cached
  for (const id of conversationIds) {
    await db.runAsync(
      'UPDATE conversations SET isCached = 1 WHERE conversationId = ?',
      [id]
    );
  }
};

export const clearOldConversations = async (): Promise<void> => {
  const db = getDatabase();

  // Delete conversations and messages that are not cached
  // Messages will cascade delete due to foreign key
  await db.runAsync('DELETE FROM conversations WHERE isCached = 0');
};

export const getLastSyncTimestamp = async (): Promise<number> => {
  const db = getDatabase();
  const result = await db.getFirstAsync<{ syncedAt: number }>(
    'SELECT MAX(syncedAt) as syncedAt FROM conversations'
  );
  return result?.syncedAt || 0;
};
```

#### 1.5 Create Profile Repository

**New File:** `src/database/repositories/profileRepository.ts`

```typescript
import { getDatabase } from '../database';
import Profile from '@objects/Profile';

export const saveProfile = async (profile: Partial<Profile>): Promise<void> => {
  const db = getDatabase();
  const now = Date.now();

  await db.runAsync(
    `INSERT OR REPLACE INTO profiles_cache
     (uid, profilePicture, name, email, userCode, syncedAt)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      profile.uid!,
      profile.profilePicture || '',
      profile.name || '',
      profile.email || '',
      profile.userCode || '',
      now,
    ]
  );
};

export const getProfile = async (uid: string): Promise<Profile | null> => {
  const db = getDatabase();

  const row = await db.getFirstAsync<{
    uid: string;
    profilePicture: string;
    name: string;
    email: string;
    userCode: string;
  }>(
    'SELECT uid, profilePicture, name, email, userCode FROM profiles_cache WHERE uid = ?',
    [uid]
  );

  if (!row) return null;

  return new Profile(
    row.uid,
    row.profilePicture,
    row.name,
    row.email,
    [], // conversations - not stored in cache
    row.userCode,
    null // oneSignalPlayerId - not stored in cache
  );
};

export const saveProfiles = async (profiles: Profile[]): Promise<void> => {
  for (const profile of profiles) {
    await saveProfile(profile);
  }
};
```

#### 1.6 Create Offline Queue Repository

**New File:** `src/database/repositories/offlineQueueRepository.ts`

```typescript
import { getDatabase } from '../database';
import UUID from 'react-native-uuid';

export interface PendingMessage {
  localId: string;
  conversationId: string;
  audioUri: string;
  timestamp: number;
  retryCount: number;
  lastError: string | null;
  status: 'pending' | 'sending' | 'failed';
}

export const addPendingMessage = async (
  conversationId: string,
  audioUri: string
): Promise<string> => {
  const db = getDatabase();
  const localId = UUID.v4().toString();
  const now = Date.now();

  await db.runAsync(
    `INSERT INTO pending_messages
     (localId, conversationId, audioUri, timestamp, retryCount, lastError, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [localId, conversationId, audioUri, now, 0, null, 'pending']
  );

  return localId;
};

export const getPendingMessages = async (): Promise<PendingMessage[]> => {
  const db = getDatabase();

  const rows = await db.getAllAsync<PendingMessage>(
    `SELECT * FROM pending_messages
     WHERE status IN ('pending', 'failed')
     ORDER BY timestamp ASC`
  );

  return rows;
};

export const updateMessageStatus = async (
  localId: string,
  status: 'pending' | 'sending' | 'failed',
  error?: string
): Promise<void> => {
  const db = getDatabase();

  if (error) {
    await db.runAsync(
      'UPDATE pending_messages SET status = ?, lastError = ?, retryCount = retryCount + 1 WHERE localId = ?',
      [status, error, localId]
    );
  } else {
    await db.runAsync(
      'UPDATE pending_messages SET status = ? WHERE localId = ?',
      [status, localId]
    );
  }
};

export const deletePendingMessage = async (localId: string): Promise<void> => {
  const db = getDatabase();
  await db.runAsync('DELETE FROM pending_messages WHERE localId = ?', [localId]);
};

export const clearOldFailedMessages = async (olderThanDays: number = 7): Promise<void> => {
  const db = getDatabase();
  const cutoffTimestamp = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

  await db.runAsync(
    'DELETE FROM pending_messages WHERE status = ? AND timestamp < ?',
    ['failed', cutoffTimestamp]
  );
};
```

---

### Phase 2: Sync Manager (Background Sync Logic)

#### 2.1 Create Sync Manager Service

**New File:** `src/services/syncManager.ts`

```typescript
import { supabase } from '@utilities/Supabase';
import Conversation from '@objects/Conversation';
import Profile from '@objects/Profile';
import {
  saveConversation,
  getRecentConversations,
  updateRecentConversationsList,
  clearOldConversations,
  getLastSyncTimestamp,
} from '@database/repositories/conversationRepository';
import { saveProfiles } from '@database/repositories/profileRepository';

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  error: string | null;
}

class SyncManager {
  private syncStatus: SyncStatus = {
    isSyncing: false,
    lastSyncTime: null,
    error: null,
  };

  private listeners: Array<(status: SyncStatus) => void> = [];

  /**
   * Sync conversations and messages from Supabase to local cache
   * @param profile - Current user profile
   * @param conversationIds - List of conversation IDs to sync (from profile.conversations)
   * @param limit - Number of recent conversations to cache (default: 20)
   */
  async syncConversations(
    profile: Profile,
    conversationIds: string[],
    limit: number = 20
  ): Promise<Conversation[]> {
    if (this.syncStatus.isSyncing) {
      console.log('⏳ Sync already in progress, skipping...');
      return [];
    }

    this.updateSyncStatus({ isSyncing: true, error: null });

    try {
      console.log('🔄 Starting conversation sync...');

      // Determine which conversations to cache (most recent)
      const recentConversationIds = conversationIds.slice(0, limit);

      // Fetch conversations from Supabase
      const conversations: Conversation[] = [];

      await Promise.all(
        recentConversationIds.map(async (id: string) => {
          try {
            const { data: conversationData, error } = await supabase
              .from('conversations')
              .select()
              .eq('conversationId', id);

            if (conversationData && conversationData[0]) {
              const conversation = await Conversation.fromJSON(conversationData[0]);
              conversations.push(conversation);

              // Save to local cache
              await saveConversation(conversation);
            }
          } catch (error) {
            console.error('Error syncing conversation:', error);
          }
        })
      );

      // Update which conversations are marked as "recent/cached"
      await updateRecentConversationsList(recentConversationIds);

      // Clean up old conversations not in recent list
      await clearOldConversations();

      console.log(`✅ Synced ${conversations.length} conversations to cache`);

      this.updateSyncStatus({
        isSyncing: false,
        lastSyncTime: Date.now(),
        error: null,
      });

      return conversations;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown sync error';
      console.error('❌ Sync failed:', errorMessage);

      this.updateSyncStatus({
        isSyncing: false,
        error: errorMessage,
      });

      throw error;
    }
  }

  /**
   * Smart sync: Only fetch messages newer than last sync
   */
  async incrementalSync(
    profile: Profile,
    conversationIds: string[]
  ): Promise<Conversation[]> {
    const lastSync = await getLastSyncTimestamp();
    console.log('📅 Last sync timestamp:', new Date(lastSync).toISOString());

    // For now, do full sync (incremental sync would require timestamp queries)
    // TODO: Implement timestamp-based filtering on Supabase queries
    return this.syncConversations(profile, conversationIds);
  }

  /**
   * Cache profiles for offline access
   */
  async cacheProfiles(profiles: Profile[]): Promise<void> {
    await saveProfiles(profiles);
    console.log(`✅ Cached ${profiles.length} profiles`);
  }

  /**
   * Get cached conversations from local database
   */
  async getCachedConversations(limit: number = 20): Promise<Conversation[]> {
    return getRecentConversations(limit);
  }

  /**
   * Subscribe to sync status changes
   */
  onSyncStatusChange(listener: (status: SyncStatus) => void): () => void {
    this.listeners.push(listener);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    this.syncStatus = { ...this.syncStatus, ...updates };
    this.listeners.forEach(listener => listener(this.syncStatus));
  }
}

export const syncManager = new SyncManager();
```

---

### Phase 3: Offline Message Queue

#### 3.1 Create Offline Message Service

**New File:** `src/services/offlineMessageQueue.ts`

```typescript
import { supabase } from '@utilities/Supabase';
import Message from '@objects/Message';
import Profile from '@objects/Profile';
import Conversation from '@objects/Conversation';
import UUID from 'react-native-uuid';
import {
  addPendingMessage,
  getPendingMessages,
  updateMessageStatus,
  deletePendingMessage,
  PendingMessage,
} from '@database/repositories/offlineQueueRepository';
import NetInfo from '@react-native-community/netinfo';

class OfflineMessageQueue {
  private isProcessing = false;

  /**
   * Queue a message for sending (when offline or for immediate retry)
   */
  async queueMessage(conversationId: string, audioUri: string): Promise<string> {
    const localId = await addPendingMessage(conversationId, audioUri);
    console.log('📤 Message queued for offline sending:', localId);

    // Try to process queue immediately (will skip if offline)
    this.processQueue().catch(console.error);

    return localId;
  }

  /**
   * Process the queue of pending messages
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      console.log('⏳ Queue already processing, skipping...');
      return;
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('📡 No network connection, skipping queue processing');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingMessages = await getPendingMessages();
      console.log(`📋 Processing ${pendingMessages.length} pending messages`);

      for (const pending of pendingMessages) {
        try {
          await this.sendPendingMessage(pending);
        } catch (error) {
          console.error('Error sending pending message:', error);
          // Continue with next message
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Send a single pending message
   */
  private async sendPendingMessage(pending: PendingMessage): Promise<void> {
    try {
      await updateMessageStatus(pending.localId, 'sending');

      // Upload audio file
      const messageId = UUID.v4().toString();
      const fileName = `message_${messageId}.mp3`;

      const response = await fetch(pending.audioUri);
      const buffer = await response.arrayBuffer();

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('message_audios')
        .upload(fileName, buffer, { contentType: 'audio/mp3' });

      if (uploadError) throw uploadError;

      const url = supabase.storage
        .from('message_audios')
        .getPublicUrl(uploadData.path).data.publicUrl;

      // Create message record
      const message = new Message(
        messageId,
        new Date(pending.timestamp),
        '', // uid - needs to be passed from context
        url,
        false
      );

      const { error: messageError } = await supabase
        .from('messages')
        .insert(message.toJSON());

      if (messageError) throw messageError;

      // Update conversation
      // Note: This requires fetching the conversation first
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select()
        .eq('conversationId', pending.conversationId)
        .single();

      if (!convError && convData) {
        const updatedMessages = [...(convData.messages || []), messageId];
        await supabase
          .from('conversations')
          .update({ messages: updatedMessages })
          .eq('conversationId', pending.conversationId);
      }

      // Success - delete from queue
      await deletePendingMessage(pending.localId);
      console.log('✅ Pending message sent successfully:', pending.localId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateMessageStatus(pending.localId, 'failed', errorMessage);
      console.error('❌ Failed to send pending message:', errorMessage);
      throw error;
    }
  }

  /**
   * Get count of pending messages
   */
  async getPendingCount(): Promise<number> {
    const pending = await getPendingMessages();
    return pending.length;
  }

  /**
   * Start listening for network changes and auto-process queue
   */
  startNetworkListener(): () => void {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        console.log('📡 Network connected, processing queue...');
        this.processQueue().catch(console.error);
      }
    });

    return unsubscribe;
  }
}

export const offlineMessageQueue = new OfflineMessageQueue();
```

**Note:** You'll need to install `@react-native-community/netinfo`:

```bash
npx expo install @react-native-community/netinfo
```

---

### Phase 4: Update ConversationsProvider (Cache-First Logic)

#### 4.1 Modify ConversationsProvider

**File:** [src/utilities/ConversationsProvider.tsx](src/utilities/ConversationsProvider.tsx)

**Changes needed:**

1. Import database functions and sync manager
2. Initialize database on mount
3. Load cached conversations immediately
4. Sync in background
5. Add sync status to context

**Modified code:**

```typescript
import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./Supabase";
import Conversation from "@objects/Conversation";
import Message from "@objects/Message";
import Profile from "@objects/Profile";
import { useProfile } from "./ProfileProvider";
import { logAgentEvent } from "./AgentLogger";
import { initDatabase } from "@database/database";
import { syncManager, SyncStatus } from "@services/syncManager";

interface ConversationsContextType {
  conversations: Conversation[];
  profiles: Profile[];
  getConversations: () => Promise<void>;
  updateMessageReadStatus: (messageId: string) => void;
  syncStatus: SyncStatus; // NEW
  refreshConversations: () => Promise<void>; // NEW
}

const ConversationsContext = createContext<ConversationsContextType | null>(null);

export const ConversationsProvider = ({ children }: { children: React.ReactNode }) => {
  // ... existing code ...
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncManager.getSyncStatus());
  const conversationChannelsRef = useRef<Map<string, any>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize database on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initDatabase();
        console.log('✅ Database initialized');
        setIsInitialized(true);
      } catch (error) {
        console.error('❌ Failed to initialize database:', error);
      }
    };

    init();

    // Subscribe to sync status changes
    const unsubscribe = syncManager.onSyncStatusChange(setSyncStatus);

    return () => {
      unsubscribe();
    };
  }, []);

  // Modified getConversations - cache-first approach
  const getConversations = async () => {
    if (!profile || !isInitialized) {
      setConversations([]);
      return;
    }

    try {
      // STEP 1: Load from cache immediately
      console.log('📦 Loading conversations from cache...');
      const cachedConversations = await syncManager.getCachedConversations(20);

      if (cachedConversations.length > 0) {
        console.log(`✅ Loaded ${cachedConversations.length} conversations from cache`);
        setConversations(cachedConversations);
      }

      // STEP 2: Sync in background
      console.log('🔄 Starting background sync...');
      const syncedConversations = await syncManager.syncConversations(
        profile,
        profile.conversations || [],
        20
      );

      // Update UI with fresh data
      if (syncedConversations.length > 0) {
        setConversations(syncedConversations);
      }
    } catch (error) {
      console.error('Error in getConversations:', error);

      // If sync fails, keep showing cached data
      const cachedConversations = await syncManager.getCachedConversations(20);
      if (cachedConversations.length > 0) {
        setConversations(cachedConversations);
      }
    }
  };

  // NEW: Manual refresh function
  const refreshConversations = async () => {
    if (!profile) return;

    try {
      const syncedConversations = await syncManager.syncConversations(
        profile,
        profile.conversations || [],
        20
      );
      setConversations(syncedConversations);
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    }
  };

  // ... rest of existing code (useEffects, updateConversations, etc.) ...

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        profiles,
        getConversations,
        updateMessageReadStatus,
        syncStatus, // NEW
        refreshConversations, // NEW
      }}
    >
      {children}
    </ConversationsContext.Provider>
  );
};

export const useConversations = () => {
  const context = useContext(ConversationsContext);
  if (!context) {
    throw new Error("useConversations must be used within a ConversationsProvider");
  }
  return context;
};
```

---

### Phase 5: Update SendMessage (Offline Queue Integration)

#### 5.1 Modify SendMessage.tsx

**File:** [src/utilities/SendMessage.tsx](src/utilities/SendMessage.tsx)

**Changes:**

1. Check network connectivity
2. Queue message if offline
3. Show optimistic UI update

```typescript
import NetInfo from '@react-native-community/netinfo';
import { offlineMessageQueue } from '@services/offlineMessageQueue';

export const sendMessage = async (
  navigation: NavigationProp<RootStackParamList>,
  profileData: {
    profile: Profile | null;
    conversations: Conversation[];
  },
  uri: string,
  conversationId: string
) => {
  console.log("📨 sendMessage called with conversationId:", conversationId);

  const { profile, conversations } = profileData;

  if (!profile) {
    console.error("❌ No profile available in sendMessage");
    Alert.alert("Error", "You must be logged in to send messages.");
    return;
  }

  const conversation = conversations.find(
    (c) => c.conversationId === conversationId
  );

  if (!conversation) {
    console.error("❌ Conversation not found:", conversationId);
    Alert.alert("Error", "Conversation not found. Please try again.");
    return;
  }

  // Check network connectivity
  const netInfo = await NetInfo.fetch();

  if (!netInfo.isConnected) {
    console.log("📡 No network, queueing message for later...");

    try {
      await offlineMessageQueue.queueMessage(conversationId, uri);
      Alert.alert(
        "Message Queued",
        "Your message will be sent when you're back online."
      );
      return;
    } catch (error) {
      Alert.alert("Error", "Failed to queue message. Please try again.");
      return;
    }
  }

  // ... rest of existing send logic ...
  // (Keep all the existing upload and database code)
};
```

---

### Phase 6: UI Improvements (Sync Indicator)

#### 6.1 Create Sync Indicator Component

**New File:** `src/components/SyncIndicator.tsx`

```typescript
import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useConversations } from '@utilities/ConversationsProvider';

export const SyncIndicator: React.FC = () => {
  const { syncStatus } = useConversations();

  if (!syncStatus.isSyncing && !syncStatus.error) {
    return null;
  }

  return (
    <View style={styles.container}>
      {syncStatus.isSyncing ? (
        <>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.text}>Syncing messages...</Text>
        </>
      ) : syncStatus.error ? (
        <Text style={styles.errorText}>Sync failed: {syncStatus.error}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#F0F0F0',
  },
  text: {
    marginLeft: 8,
    fontSize: 12,
    color: '#666',
  },
  errorText: {
    fontSize: 12,
    color: '#FF3B30',
  },
});
```

#### 6.2 Add Sync Indicator to ConversationsScreen

**File:** You'll need to find your ConversationsScreen component

```typescript
import { SyncIndicator } from '@components/SyncIndicator';

// In your render method, add near the top:
<SyncIndicator />
```

---

### Phase 7: Initialize on App Start

#### 7.1 Update App.tsx

**File:** [src/App.tsx](src/App.tsx)

Add database initialization and offline queue network listener:

```typescript
import { useEffect } from 'react';
import { initDatabase } from '@database/database';
import { offlineMessageQueue } from '@services/offlineMessageQueue';

export default function App() {
  // ... existing code ...

  useEffect(() => {
    // Initialize database
    initDatabase().catch(console.error);

    // Start network listener for offline queue
    const unsubscribe = offlineMessageQueue.startNetworkListener();

    return () => {
      unsubscribe();
    };
  }, []);

  // ... rest of component ...
}
```

---

## Migration Strategy

### First-Time Setup (No Existing Cache)

1. User opens app
2. Database is initialized (empty tables created)
3. ConversationsProvider tries to load from cache → empty result
4. Shows empty state briefly
5. Syncs from Supabase in background
6. Populates cache
7. UI updates with conversations

### Subsequent Opens

1. User opens app
2. ConversationsProvider loads from cache immediately → **instant display**
3. Background sync fetches updates
4. UI updates if there are changes

### Cache Invalidation

**When to clear cache:**
- User logs out → clear all cached data
- Database corruption detected → recreate tables
- Major app update → check `db_version` in sync_metadata

**Implementation:**

**New File:** `src/database/clearCache.ts`

```typescript
import { getDatabase } from './database';

export const clearAllCache = async (): Promise<void> => {
  const db = getDatabase();

  await db.execAsync('DELETE FROM conversations');
  await db.execAsync('DELETE FROM messages');
  await db.execAsync('DELETE FROM profiles_cache');
  await db.execAsync('DELETE FROM pending_messages');
  await db.execAsync('DELETE FROM sync_metadata');

  console.log('✅ All cache cleared');
};
```

Call this when user logs out:

```typescript
// In your logout function
await clearAllCache();
```

---

## Edge Cases and Error Handling

### 1. Cache Corruption

**Detection:**
- Try-catch around database operations
- If error contains "database disk image is malformed"

**Resolution:**
```typescript
try {
  await getRecentConversations();
} catch (error) {
  if (error.message.includes('malformed')) {
    console.error('Cache corrupted, rebuilding...');
    await closeDatabase();
    // Delete database file
    await FileSystem.deleteAsync(DATABASE_PATH);
    // Re-initialize
    await initDatabase();
  }
}
```

### 2. Conversation Deleted on Server

**Scenario:** Conversation exists in cache but deleted from Supabase

**Solution:**
- Sync will fail to fetch it
- Don't show error
- Remove from cache during `clearOldConversations()`

### 3. Message Edited on Server

**Current architecture:** Messages are immutable (no UPDATE support)

**Future:** If you add message editing:
- Add `updatedAt` field to messages table
- Check `updatedAt > syncedAt` during sync
- Re-fetch and update cache

### 4. User Logs Out

```typescript
// In logout handler
await clearAllCache();
await closeDatabase();
```

### 5. Real-Time Subscription Receives Update

**Current behavior:** Fetches fresh data from Supabase

**With caching:** Also update local cache

```typescript
// In ConversationsProvider real-time handler
const updatedConversation = await Conversation.fromJSON(conversationData[0]);

// Update UI
setConversations(prev => /* ... */);

// ALSO update cache
await saveConversation(updatedConversation);
```

---

## COMPREHENSIVE TESTING REQUIREMENTS

> **FOR AI AGENTS:** After implementing each phase, you MUST run the tests specified in that phase's testing section. Do not proceed to the next phase until all tests pass.

---

### 🧪 PHASE 1 TESTING: Database Layer

**WHAT TO TEST:** Verify database schema creation, initialization, and basic operations.

**HOW TO TEST:**

1. **Create test file:** `src/database/__tests__/database.test.ts`

```typescript
import { initDatabase, getDatabase, setSyncMetadata, getSyncMetadata } from '../database';

describe('Database Initialization', () => {
  beforeEach(async () => {
    await initDatabase();
  });

  test('should initialize database without errors', async () => {
    const db = getDatabase();
    expect(db).toBeDefined();
  });

  test('should create all required tables', async () => {
    const db = getDatabase();

    // Check if tables exist
    const tables = await db.getAllAsync(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );

    const tableNames = tables.map((t: any) => t.name);
    expect(tableNames).toContain('conversations');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('profiles_cache');
    expect(tableNames).toContain('pending_messages');
    expect(tableNames).toContain('sync_metadata');
  });

  test('should set and get sync metadata', async () => {
    await setSyncMetadata('test_key', 'test_value');
    const value = await getSyncMetadata('test_key');
    expect(value).toBe('test_value');
  });
});
```

2. **Create test file:** `src/database/__tests__/conversationRepository.test.ts`

```typescript
import { saveConversation, getRecentConversations, getMessagesForConversation } from '../repositories/conversationRepository';
import { initDatabase } from '../database';
import Conversation from '@objects/Conversation';
import Message from '@objects/Message';

describe('Conversation Repository', () => {
  beforeEach(async () => {
    await initDatabase();
    // Clear test data
    const db = getDatabase();
    await db.execAsync('DELETE FROM conversations');
    await db.execAsync('DELETE FROM messages');
  });

  test('should save and retrieve conversation', async () => {
    const message = new Message(
      'msg-1',
      new Date(),
      'user-123',
      'https://example.com/audio.mp3',
      false
    );

    const conversation = new Conversation(
      'conv-1',
      ['user-123', 'user-456'],
      [message],
      []
    );

    await saveConversation(conversation);

    const retrieved = await getRecentConversations(20);
    expect(retrieved).toHaveLength(1);
    expect(retrieved[0].conversationId).toBe('conv-1');
  });

  test('should retrieve messages for conversation', async () => {
    const message1 = new Message('msg-1', new Date(), 'user-123', 'url1', false);
    const message2 = new Message('msg-2', new Date(), 'user-456', 'url2', true);

    const conversation = new Conversation(
      'conv-1',
      ['user-123', 'user-456'],
      [message1, message2],
      []
    );

    await saveConversation(conversation);

    const messages = await getMessagesForConversation('conv-1');
    expect(messages).toHaveLength(2);
    expect(messages[0].messageId).toBe('msg-1');
  });

  test('should respect recent conversations limit', async () => {
    // Create 25 conversations
    for (let i = 0; i < 25; i++) {
      const conv = new Conversation(`conv-${i}`, ['u1', 'u2'], [], []);
      await saveConversation(conv);
    }

    const recent = await getRecentConversations(20);
    expect(recent.length).toBeLessThanOrEqual(20);
  });
});
```

**RUN TESTS:**

```bash
npm test -- database.test.ts
npm test -- conversationRepository.test.ts
```

**EXPECTED RESULTS:**
- ✅ All tables created successfully
- ✅ Metadata can be stored and retrieved
- ✅ Conversations can be saved and retrieved
- ✅ Messages are correctly associated with conversations
- ✅ Limit of 20 recent conversations is respected

---

### 🧪 PHASE 2 TESTING: Sync Manager

**WHAT TO TEST:** Verify sync logic, background syncing, and cache updates.

**HOW TO TEST:**

1. **Create test file:** `src/services/__tests__/syncManager.test.ts`

```typescript
import { syncManager } from '../syncManager';
import { initDatabase } from '@database/database';
import Profile from '@objects/Profile';

describe('Sync Manager', () => {
  let mockProfile: Profile;

  beforeEach(async () => {
    await initDatabase();
    mockProfile = new Profile(
      'user-123',
      'https://example.com/pic.jpg',
      'Test User',
      'test@example.com',
      ['conv-1', 'conv-2'],
      'ABC123',
      null
    );
  });

  test('should get cached conversations when cache is empty', async () => {
    const cached = await syncManager.getCachedConversations(20);
    expect(cached).toEqual([]);
  });

  test('should update sync status when syncing', (done) => {
    const unsubscribe = syncManager.onSyncStatusChange((status) => {
      if (status.isSyncing) {
        expect(status.isSyncing).toBe(true);
        unsubscribe();
        done();
      }
    });

    // Trigger sync (will fail without real Supabase connection, but will update status)
    syncManager.syncConversations(mockProfile, [], 20).catch(() => {});
  });

  test('should get current sync status', () => {
    const status = syncManager.getSyncStatus();
    expect(status).toHaveProperty('isSyncing');
    expect(status).toHaveProperty('lastSyncTime');
    expect(status).toHaveProperty('error');
  });
});
```

**MANUAL TESTING:**

1. **Test Initial Sync:**
   - Delete app from device
   - Install fresh build
   - Log in
   - **VERIFY:** Console shows "🔄 Starting conversation sync..."
   - **VERIFY:** Conversations are saved to database
   - **VERIFY:** UI displays conversations after sync

2. **Test Cache Loading:**
   - Close app completely
   - Reopen app
   - **VERIFY:** Console shows "📦 Loading conversations from cache..."
   - **VERIFY:** Conversations appear instantly (< 500ms)
   - **VERIFY:** Background sync starts after cache loads

**RUN TESTS:**

```bash
npm test -- syncManager.test.ts
```

**EXPECTED RESULTS:**
- ✅ Sync status updates correctly
- ✅ Empty cache returns empty array
- ✅ Sync listeners receive status updates

---

### 🧪 PHASE 3 TESTING: Offline Message Queue

**WHAT TO TEST:** Message queueing, network detection, and automatic retry.

**HOW TO TEST:**

1. **Create test file:** `src/services/__tests__/offlineMessageQueue.test.ts`

```typescript
import { offlineMessageQueue } from '../offlineMessageQueue';
import { getPendingMessages, addPendingMessage, deletePendingMessage } from '@database/repositories/offlineQueueRepository';
import { initDatabase } from '@database/database';

describe('Offline Message Queue', () => {
  beforeEach(async () => {
    await initDatabase();
    // Clear queue
    const db = getDatabase();
    await db.execAsync('DELETE FROM pending_messages');
  });

  test('should queue message for offline sending', async () => {
    const localId = await offlineMessageQueue.queueMessage(
      'conv-1',
      'file:///path/to/audio.mp3'
    );

    expect(localId).toBeDefined();

    const pending = await getPendingMessages();
    expect(pending).toHaveLength(1);
    expect(pending[0].conversationId).toBe('conv-1');
  });

  test('should get pending message count', async () => {
    await addPendingMessage('conv-1', 'uri1');
    await addPendingMessage('conv-2', 'uri2');

    const count = await offlineMessageQueue.getPendingCount();
    expect(count).toBe(2);
  });

  test('should delete pending message after sending', async () => {
    const localId = await addPendingMessage('conv-1', 'uri1');

    await deletePendingMessage(localId);

    const pending = await getPendingMessages();
    expect(pending).toHaveLength(0);
  });
});
```

**MANUAL TESTING:**

1. **Test Offline Queueing:**
   - Open app
   - **Turn OFF WiFi and mobile data**
   - Record and send a message
   - **VERIFY:** Alert shows "Message Queued"
   - **VERIFY:** Console shows "📡 No network, queueing message for later..."
   - **VERIFY:** Message appears in `pending_messages` table

2. **Test Network Reconnection:**
   - Keep app open with queued message
   - **Turn ON WiFi/mobile data**
   - **VERIFY:** Console shows "📡 Network connected, processing queue..."
   - **VERIFY:** Message uploads to Supabase
   - **VERIFY:** Message removed from `pending_messages` table
   - **VERIFY:** Message appears in conversation

3. **Test Failed Send with Retry:**
   - Queue a message while offline
   - Simulate server error (disconnect Supabase temporarily)
   - Turn network back on
   - **VERIFY:** Retry count increments
   - **VERIFY:** Status changes to 'failed'
   - **VERIFY:** Error message stored

**RUN TESTS:**

```bash
npm test -- offlineMessageQueue.test.ts
```

**EXPECTED RESULTS:**
- ✅ Messages can be queued
- ✅ Pending count is accurate
- ✅ Messages can be deleted from queue
- ✅ Network listener triggers queue processing

---

### 🧪 PHASE 4 TESTING: ConversationsProvider Integration

**WHAT TO TEST:** Cache-first loading, background sync, and UI updates.

**MANUAL TESTING (CRITICAL):**

1. **Test Fresh Install (No Cache):**
   - Delete app
   - Install fresh build
   - Log in
   - **VERIFY:** Empty cache loads instantly
   - **VERIFY:** Sync starts automatically
   - **VERIFY:** Conversations appear after sync completes
   - **VERIFY:** `syncStatus.isSyncing` changes from `true` to `false`

2. **Test Subsequent App Opens (With Cache):**
   - Send a message to create data
   - Close app completely (kill process)
   - Reopen app
   - **VERIFY:** Conversations appear in < 500ms
   - **VERIFY:** Console shows "📦 Loading conversations from cache..."
   - **VERIFY:** Sync happens in background
   - **VERIFY:** No loading spinner blocks UI

3. **Test Background Sync Updates:**
   - Open app on Device A
   - Send message from Device B to Device A user
   - **VERIFY:** Real-time subscription triggers update
   - **VERIFY:** New message appears in UI
   - **VERIFY:** Cache is updated (check database)

4. **Test Sync Error Handling:**
   - Disconnect from internet
   - Close and reopen app
   - **VERIFY:** Cached conversations still load
   - **VERIFY:** Sync fails gracefully
   - **VERIFY:** `syncStatus.error` contains error message
   - **VERIFY:** UI still shows cached data

**INSPECTION CHECKLIST:**

```bash
# Check if database initialized
console.log('Database initialized:', isInitialized);

# Check sync status
console.log('Sync status:', syncStatus);

# Verify cache contents
const cached = await syncManager.getCachedConversations(20);
console.log('Cached conversations:', cached.length);
```

**EXPECTED RESULTS:**
- ✅ Cache loads instantly on subsequent opens
- ✅ Background sync updates cache
- ✅ Sync status properly reflected in context
- ✅ Errors don't prevent cached data from showing

---

### 🧪 PHASE 5 TESTING: SendMessage Offline Integration

**WHAT TO TEST:** Network detection, offline queueing, and optimistic UI.

**MANUAL TESTING:**

1. **Test Online Message Sending:**
   - Connect to network
   - Send a message
   - **VERIFY:** Message uploads immediately
   - **VERIFY:** No queueing occurs
   - **VERIFY:** Message appears in conversation

2. **Test Offline Message Queueing:**
   - Disconnect from network
   - Send a message
   - **VERIFY:** Alert shows "Message Queued"
   - **VERIFY:** Message saved to `pending_messages` table
   - **VERIFY:** `netInfo.isConnected` is false

3. **Test Automatic Sending on Reconnect:**
   - Queue 3 messages while offline
   - Reconnect to network
   - **VERIFY:** All 3 messages send automatically
   - **VERIFY:** Console shows "📡 Network connected, processing queue..."
   - **VERIFY:** Messages appear in Supabase
   - **VERIFY:** Queue is empty after processing

4. **Test Error Handling:**
   - Queue a message
   - Reconnect but simulate Supabase error (invalid audio file)
   - **VERIFY:** Message status becomes 'failed'
   - **VERIFY:** Error message stored
   - **VERIFY:** Retry count increments

**EXPECTED RESULTS:**
- ✅ Online messages send immediately
- ✅ Offline messages queue correctly
- ✅ Queue processes automatically on reconnect
- ✅ Failed messages marked with error

---

### 🧪 PHASE 6 TESTING: UI Components

**WHAT TO TEST:** Sync indicator visibility and states.

**MANUAL TESTING:**

1. **Test Sync Indicator During Sync:**
   - Clear app cache
   - Open app
   - **VERIFY:** Sync indicator shows "Syncing messages..."
   - **VERIFY:** Spinner is visible
   - **VERIFY:** Indicator disappears after sync completes

2. **Test Sync Indicator on Error:**
   - Disconnect from internet
   - Force a sync
   - **VERIFY:** Sync indicator shows error message
   - **VERIFY:** Error text is red
   - **VERIFY:** No spinner

3. **Test Sync Indicator Hidden When Idle:**
   - Complete a sync successfully
   - Wait for sync to finish
   - **VERIFY:** Sync indicator is not visible

**VISUAL INSPECTION:**
- [ ] Sync indicator appears at top of screen
- [ ] Text is readable (not too small)
- [ ] Colors match app theme
- [ ] Spinner animates smoothly
- [ ] Error messages are clear

**EXPECTED RESULTS:**
- ✅ Indicator shows during sync
- ✅ Indicator shows errors
- ✅ Indicator hides when idle

---

### 🧪 PHASE 7 TESTING: App Initialization

**WHAT TO TEST:** Database initialization and network listener setup.

**MANUAL TESTING:**

1. **Test Database Initialization on App Start:**
   - Kill app completely
   - Reopen app
   - **VERIFY:** Console shows "✅ Database initialized"
   - **VERIFY:** No initialization errors
   - **VERIFY:** Database tables exist

2. **Test Network Listener Setup:**
   - Open app
   - Queue a message while offline
   - Toggle airplane mode ON → OFF
   - **VERIFY:** Queue processes automatically
   - **VERIFY:** Console shows "📡 Network connected, processing queue..."

3. **Test Cleanup on App Close:**
   - Open app
   - Close app
   - **VERIFY:** Network listener unsubscribes (no memory leaks)
   - **VERIFY:** No console errors

**EXPECTED RESULTS:**
- ✅ Database initializes on app start
- ✅ Network listener is active
- ✅ Cleanup happens properly

---

### 🧪 END-TO-END INTEGRATION TESTS

**COMPLETE USER FLOWS TO TEST:**

#### Flow 1: Fresh Install to First Message

1. Delete app from device
2. Install fresh build
3. Open app and log in
4. **VERIFY:** Database initializes
5. **VERIFY:** Sync starts and completes
6. Navigate to conversation
7. Send a message
8. **VERIFY:** Message uploads successfully
9. Close app
10. Reopen app
11. **VERIFY:** Message loads from cache instantly

**EXPECTED:** < 500ms load time on subsequent opens

---

#### Flow 2: Offline Usage and Sync

1. Open app (with existing cache)
2. Turn OFF network
3. Send 3 messages
4. **VERIFY:** All 3 messages queued
5. Close app
6. Turn ON network
7. Reopen app
8. **VERIFY:** Queue processes automatically
9. **VERIFY:** All 3 messages appear in conversation
10. **VERIFY:** Cache updated

**EXPECTED:** All messages sent successfully after reconnection

---

#### Flow 3: Multi-Device Sync

1. Log in on Device A
2. Log in on Device B (same account)
3. Send message from Device B
4. **VERIFY:** Device A receives real-time update
5. **VERIFY:** Device A cache updated
6. Close Device A app
7. Send another message from Device B
8. Reopen Device A app
9. **VERIFY:** New message appears after sync

**EXPECTED:** Real-time updates work, cache stays in sync

---

#### Flow 4: Error Recovery

1. Open app
2. Corrupt database (manually delete schema)
3. Try to load conversations
4. **VERIFY:** Error detected
5. **VERIFY:** Database rebuilt automatically
6. **VERIFY:** Sync repopulates cache
7. **VERIFY:** App continues working

**EXPECTED:** Graceful recovery from corruption

---

#### Flow 5: Logout and Clear Cache

1. Open app with cached data
2. Log out
3. **VERIFY:** `clearAllCache()` called
4. **VERIFY:** All tables are empty
5. Log back in (different user)
6. **VERIFY:** Only new user's data cached

**EXPECTED:** No data leakage between users

---

### 🧪 PERFORMANCE TESTING

**BENCHMARKS TO MEASURE:**

1. **App Startup Time:**
   - Fresh install: < 2 seconds to first render
   - Cached data: < 500ms to show conversations

2. **Sync Performance:**
   - 20 conversations with 50 messages each: < 5 seconds
   - Database queries: < 10ms per query

3. **Memory Usage:**
   - Base app: ~50 MB
   - With cache: < 100 MB total
   - No memory leaks on repeated open/close

4. **Database Size:**
   - 20 conversations: < 5 MB
   - 1,000 messages: < 50 MB

**HOW TO MEASURE:**

```typescript
// Measure cache load time
const start = Date.now();
const cached = await syncManager.getCachedConversations(20);
const loadTime = Date.now() - start;
console.log('Cache load time:', loadTime, 'ms');

// Measure sync time
const syncStart = Date.now();
await syncManager.syncConversations(profile, conversationIds, 20);
const syncTime = Date.now() - syncStart;
console.log('Sync time:', syncTime, 'ms');
```

**EXPECTED RESULTS:**
- ✅ Cache loads in < 500ms
- ✅ Sync completes in < 5 seconds
- ✅ No performance degradation over time
- ✅ Smooth UI (60 FPS)

---

### 🧪 REGRESSION TESTING

**VERIFY EXISTING FEATURES STILL WORK:**

- [ ] Real-time message updates (Supabase subscriptions)
- [ ] Audio recording and playback
- [ ] Read receipts (`isRead` flag updates)
- [ ] Profile updates
- [ ] Friend requests
- [ ] Push notifications
- [ ] Audio settings (speaker mode, autoplay)

**THESE SHOULD NOT BE AFFECTED BY CACHING**

---

### 📊 FINAL TESTING SUMMARY

**BEFORE MERGING TO MAIN:**

1. **Run all unit tests:**

   ```bash
   npm test
   ```

   **EXPECTED:** All tests pass

2. **Run on both platforms:**
   - [ ] iOS simulator
   - [ ] iOS physical device
   - [ ] Android emulator
   - [ ] Android physical device

3. **Test all flows:**
   - [ ] Fresh install
   - [ ] Offline queueing
   - [ ] Background sync
   - [ ] Multi-device sync
   - [ ] Error recovery
   - [ ] Logout/clear cache

4. **Performance benchmarks:**
   - [ ] Startup < 500ms
   - [ ] Sync < 5 seconds
   - [ ] No memory leaks

5. **User acceptance:**
   - [ ] Beta testers confirm faster app
   - [ ] No crashes reported
   - [ ] Messages send/receive correctly

**SIGN-OFF CHECKLIST:**

- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Manual testing complete on iOS & Android
- [ ] Performance meets benchmarks
- [ ] No regressions in existing features
- [ ] Code reviewed and approved
- [ ] Documentation updated
- [ ] Ready for production deployment

---

## Performance Considerations

### Database Size

**Estimate:**
- 20 conversations
- Average 50 messages per conversation
- 1,000 total messages cached
- ~100 KB per message record (including indexes)
- **Total: ~100 MB max**

This is well within mobile storage limits.

### Query Performance

- Indexes on `conversationId` and `timestamp` ensure fast queries
- SQLite handles 1,000 rows effortlessly (<10ms queries)

### Memory Usage

- Don't load all conversations into memory at once
- Paginate message lists in UI (only render visible messages)
- Use `FlatList` with `windowSize` optimization

---

## Future Enhancements

### 1. Incremental Sync (Timestamp-Based)

Currently, sync fetches all conversations. Optimize by:

```typescript
// Fetch only messages newer than last sync
const lastSync = await getLastSyncTimestamp();

const { data } = await supabase
  .from('messages')
  .select()
  .gt('timestamp', new Date(lastSync).toISOString());
```

### 2. Audio File Caching Metadata

Track which audio files are downloaded:

```sql
CREATE TABLE audio_cache (
  messageId TEXT PRIMARY KEY,
  localPath TEXT NOT NULL,
  downloadedAt INTEGER NOT NULL
);
```

### 3. Pagination for Large Conversation Histories

Instead of loading all messages:

```typescript
// Load in batches of 50
const getMessagesPaginated = async (conversationId: string, offset: number, limit: number) => {
  // ...
};
```

### 4. Conflict Resolution

If user sends message on two devices while offline:

- Use vector clocks or CRDTs
- Or simpler: server timestamp wins

---

## Implementation Order (Step-by-Step)

### Week 1: Foundation
1. ✅ Install `expo-sqlite` and `@react-native-community/netinfo`
2. ✅ Create database schema ([src/database/schema.ts](src/database/schema.ts))
3. ✅ Create database service ([src/database/database.ts](src/database/database.ts))
4. ✅ Test database initialization

### Week 2: Repositories
5. ✅ Create conversation repository ([src/database/repositories/conversationRepository.ts](src/database/repositories/conversationRepository.ts))
6. ✅ Create profile repository ([src/database/repositories/profileRepository.ts](src/database/repositories/profileRepository.ts))
7. ✅ Create offline queue repository ([src/database/repositories/offlineQueueRepository.ts](src/database/repositories/offlineQueueRepository.ts))
8. ✅ Write unit tests for repositories

### Week 3: Sync Manager
9. ✅ Create sync manager service ([src/services/syncManager.ts](src/services/syncManager.ts))
10. ✅ Test sync manager with mock data
11. ✅ Create offline message queue service ([src/services/offlineMessageQueue.ts](src/services/offlineMessageQueue.ts))

### Week 4: Integration
12. ✅ Update ConversationsProvider with cache-first logic
13. ✅ Update SendMessage with offline queue
14. ✅ Initialize database in App.tsx
15. ✅ Add network listener for queue processing

### Week 5: UI & Polish
16. ✅ Create SyncIndicator component
17. ✅ Add sync indicator to ConversationsScreen
18. ✅ Add pull-to-refresh functionality
19. ✅ Test on real devices (iOS + Android)

### Week 6: Testing & Refinement
20. ✅ End-to-end testing (all scenarios)
21. ✅ Performance profiling
22. ✅ Bug fixes and optimizations
23. ✅ Documentation updates

---

## Summary

This implementation plan provides:

✅ **Offline-first architecture** with SQLite caching
✅ **Instant app startup** by loading cached data first
✅ **Background sync** for fresh data without blocking UI
✅ **Offline message queueing** with automatic retry
✅ **Real-time updates** that also update the cache
✅ **Clean separation** of concerns (repositories, services, providers)
✅ **Edge case handling** for corruption, deletions, and conflicts

**Next Steps:**
1. Review this plan
2. Create a new branch: `git checkout -b feature/message-caching`
3. Start with Phase 1 (Database Layer)
4. Test incrementally
5. Deploy to beta testers

Let me know if you'd like me to start implementing any specific phase!
