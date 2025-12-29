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
