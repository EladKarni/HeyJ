/**
 * Database Integration Test
 *
 * This test verifies that the caching database works correctly.
 * Run with: npm test -- database-integration.test.ts
 */

import { initDatabase, getDatabase, setSyncMetadata, getSyncMetadata } from '../database';
import { saveConversation, getRecentConversations, getMessagesForConversation } from '../repositories/conversationRepository';
import { saveProfile, getProfile } from '../repositories/profileRepository';
import { addPendingMessage, getPendingMessages, deletePendingMessage } from '../repositories/offlineQueueRepository';
import Conversation from '@objects/Conversation';
import Message from '@objects/Message';
import Profile from '@objects/Profile';

describe('Database Integration Tests', () => {
  beforeAll(async () => {
    await initDatabase();
  });

  afterEach(async () => {
    // Clean up test data
    const db = getDatabase();
    await db.execAsync('DELETE FROM conversations');
    await db.execAsync('DELETE FROM messages');
    await db.execAsync('DELETE FROM profiles_cache');
    await db.execAsync('DELETE FROM pending_messages');
    await db.execAsync('DELETE FROM sync_metadata');
  });

  describe('Database Initialization', () => {
    test('should initialize database without errors', async () => {
      const db = getDatabase();
      expect(db).toBeDefined();
    });

    test('should create all required tables', async () => {
      const db = getDatabase();

      const tables = await db.getAllAsync<{ name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table'"
      );

      const tableNames = tables.map(t => t.name);
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

  describe('Conversation Repository', () => {
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
      expect(retrieved[0].messages).toHaveLength(1);
      expect(retrieved[0].messages[0].messageId).toBe('msg-1');
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
      expect(messages[1].messageId).toBe('msg-2');
    });

    test('should respect recent conversations limit', async () => {
      // Create 25 conversations
      const conversations = [];
      for (let i = 0; i < 25; i++) {
        const conv = new Conversation(`conv-${i}`, ['u1', 'u2'], [], []);
        conversations.push(saveConversation(conv));
      }
      await Promise.all(conversations);

      const recent = await getRecentConversations(20);
      expect(recent.length).toBeLessThanOrEqual(20);
    });

    test('should maintain message order by timestamp', async () => {
      const now = Date.now();
      const message1 = new Message('msg-1', new Date(now - 3000), 'user-123', 'url1', false);
      const message2 = new Message('msg-2', new Date(now - 2000), 'user-456', 'url2', false);
      const message3 = new Message('msg-3', new Date(now - 1000), 'user-123', 'url3', false);

      const conversation = new Conversation(
        'conv-1',
        ['user-123', 'user-456'],
        [message1, message2, message3],
        []
      );

      await saveConversation(conversation);

      const messages = await getMessagesForConversation('conv-1');
      expect(messages[0].messageId).toBe('msg-1'); // Oldest
      expect(messages[1].messageId).toBe('msg-2');
      expect(messages[2].messageId).toBe('msg-3'); // Newest
    });
  });

  describe('Profile Repository', () => {
    test('should save and retrieve profile', async () => {
      const profile = new Profile(
        'user-123',
        'https://example.com/pic.jpg',
        'Test User',
        'test@example.com',
        [],
        'ABC123',
        null
      );

      await saveProfile(profile);

      const retrieved = await getProfile('user-123');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.uid).toBe('user-123');
      expect(retrieved?.name).toBe('Test User');
      expect(retrieved?.email).toBe('test@example.com');
    });

    test('should return null for non-existent profile', async () => {
      const retrieved = await getProfile('non-existent');
      expect(retrieved).toBeNull();
    });

    test('should update existing profile', async () => {
      const profile1 = new Profile('user-123', 'pic1.jpg', 'Name 1', 'email1@test.com', [], 'CODE1', null);
      await saveProfile(profile1);

      const profile2 = new Profile('user-123', 'pic2.jpg', 'Name 2', 'email2@test.com', [], 'CODE2', null);
      await saveProfile(profile2);

      const retrieved = await getProfile('user-123');
      expect(retrieved?.name).toBe('Name 2');
      expect(retrieved?.email).toBe('email2@test.com');
    });
  });

  describe('Offline Queue Repository', () => {
    test('should queue message for offline sending', async () => {
      const localId = await addPendingMessage(
        'conv-1',
        'file:///path/to/audio.mp3'
      );

      expect(localId).toBeDefined();
      expect(typeof localId).toBe('string');

      const pending = await getPendingMessages();
      expect(pending).toHaveLength(1);
      expect(pending[0].conversationId).toBe('conv-1');
      expect(pending[0].status).toBe('pending');
    });

    test('should get pending message count', async () => {
      await addPendingMessage('conv-1', 'uri1');
      await addPendingMessage('conv-2', 'uri2');
      await addPendingMessage('conv-3', 'uri3');

      const pending = await getPendingMessages();
      expect(pending).toHaveLength(3);
    });

    test('should delete pending message after sending', async () => {
      const localId = await addPendingMessage('conv-1', 'uri1');

      let pending = await getPendingMessages();
      expect(pending).toHaveLength(1);

      await deletePendingMessage(localId);

      pending = await getPendingMessages();
      expect(pending).toHaveLength(0);
    });
  });
});
