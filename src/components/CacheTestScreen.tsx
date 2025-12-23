/**
 * Cache Test Screen
 *
 * Temporary component to test the caching functionality.
 * Add this to your navigation to test manually.
 *
 * Usage:
 * 1. Navigate to this screen
 * 2. Click "Initialize Database"
 * 3. Click "Test Save Conversation"
 * 4. Click "Test Load from Cache"
 * 5. Check console logs for results
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { initDatabase } from '@database/database';
import { saveConversation, getRecentConversations } from '@database/repositories/conversationRepository';
import { syncManager } from '@services/syncManager';
import Conversation from '@objects/Conversation';
import Message from '@objects/Message';
import AppLogger from "@/utilities/AppLogger";

export const CacheTestScreen: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isDbInitialized, setIsDbInitialized] = useState(false);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    AppLogger.debug(message);
  };

  const handleInitDatabase = async () => {
    try {
      addLog('🔄 Initializing database...');
      await initDatabase();
      setIsDbInitialized(true);
      addLog('✅ Database initialized successfully');
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleTestSaveConversation = async () => {
    try {
      addLog('🔄 Creating test conversation...');

      const testMessage = new Message(
        'test-msg-1',
        new Date(),
        'test-user-1',
        'https://example.com/test-audio.mp3',
        false
      );

      const testConversation = new Conversation(
        'test-conv-1',
        ['test-user-1', 'test-user-2'],
        [testMessage],
        []
      );

      addLog('🔄 Saving to cache...');
      await saveConversation(testConversation);
      addLog('✅ Conversation saved to cache');
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleTestLoadFromCache = async () => {
    try {
      addLog('🔄 Loading from cache...');
      const cached = await getRecentConversations(20);
      addLog(`✅ Loaded ${cached.length} conversations from cache`);

      cached.forEach((conv, index) => {
        addLog(`  ${index + 1}. ${conv.conversationId} (${conv.messages.length} messages)`);
      });
    } catch (error) {
      addLog(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleTestSyncStatus = () => {
    const status = syncManager.getSyncStatus();
    addLog(`📊 Sync Status:`);
    addLog(`  - Is Syncing: ${status.isSyncing}`);
    addLog(`  - Last Sync: ${status.lastSyncTime ? new Date(status.lastSyncTime).toLocaleString() : 'Never'}`);
    addLog(`  - Error: ${status.error || 'None'}`);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cache Test Screen</Text>
      <Text style={styles.subtitle}>Database: {isDbInitialized ? '✅ Ready' : '⏳ Not Initialized'}</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton]}
          onPress={handleInitDatabase}
          disabled={isDbInitialized}
        >
          <Text style={styles.buttonText}>1. Initialize Database</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleTestSaveConversation}
          disabled={!isDbInitialized}
        >
          <Text style={styles.buttonText}>2. Test Save Conversation</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleTestLoadFromCache}
          disabled={!isDbInitialized}
        >
          <Text style={styles.buttonText}>3. Test Load from Cache</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton]}
          onPress={handleTestSyncStatus}
        >
          <Text style={styles.buttonText}>4. Check Sync Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.warningButton]}
          onPress={handleClearLogs}
        >
          <Text style={styles.buttonText}>Clear Logs</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.logContainer}>
        <Text style={styles.logTitle}>Logs:</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>
            {log}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  buttonContainer: {
    gap: 10,
    marginBottom: 20,
  },
  button: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
  },
  secondaryButton: {
    backgroundColor: '#34C759',
  },
  warningButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  logContainer: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 10,
    borderRadius: 8,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  logText: {
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
