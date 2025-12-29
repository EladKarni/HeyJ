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
