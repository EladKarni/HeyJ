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
