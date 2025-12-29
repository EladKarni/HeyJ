import { supabase } from '@utilities/Supabase';
import Message from '@objects/Message';
import UUID from 'react-native-uuid';
import {
  addPendingMessage,
  getPendingMessages,
  updateMessageStatus,
  deletePendingMessage,
  PendingMessage,
} from '@database/repositories/offlineQueueRepository';
import NetInfo from '@react-native-community/netinfo';
import AppLogger from "../utilities/AppLogger";

class OfflineMessageQueue {
  private isProcessing = false;

  /**
   * Queue a message for sending (when offline or for immediate retry)
   */
  async queueMessage(conversationId: string, audioUri: string): Promise<string> {
    const localId = await addPendingMessage(conversationId, audioUri);
    AppLogger.debug('📤 Message queued for offline sending', { localId });

    // Try to process queue immediately (will skip if offline)
    this.processQueue().catch((error) => AppLogger.error("Error processing queue", error instanceof Error ? error : new Error(String(error))));

    return localId;
  }

  /**
   * Process the queue of pending messages
   */
  async processQueue(): Promise<void> {
    if (this.isProcessing) {
      AppLogger.debug('⏳ Queue already processing, skipping...');
      return;
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      AppLogger.debug('📡 No network connection, skipping queue processing');
      return;
    }

    this.isProcessing = true;

    try {
      const pendingMessages = await getPendingMessages();
      AppLogger.debug(`📋 Processing ${pendingMessages.length} pending messages`);

      for (const pending of pendingMessages) {
        try {
          await this.sendPendingMessage(pending);
        } catch (error) {
          AppLogger.error('Error sending pending message:', error instanceof Error ? error : new Error(String(error)));
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
      // Note: This needs the user's UID which should be passed from context
      // For now, we'll fetch from the conversation to get the current user's UID
      const { data: convData, error: convError } = await supabase
        .from('conversations')
        .select()
        .eq('conversationId', pending.conversationId)
        .single();

      if (convError || !convData) {
        throw new Error('Could not find conversation for pending message');
      }

      // Get current user from session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error('No authenticated user');
      }

      const message = new Message(
        messageId,
        new Date(pending.timestamp),
        session.user.id,
        url,
        false
      );

      const { error: messageError } = await supabase
        .from('messages')
        .insert(message.toJSON());

      if (messageError) throw messageError;

      // Update conversation
      const updatedMessages = [...(convData.messages || []), messageId];
      await supabase
        .from('conversations')
        .update({ messages: updatedMessages })
        .eq('conversationId', pending.conversationId);

      // Success - delete from queue
      await deletePendingMessage(pending.localId);
      AppLogger.debug('✅ Pending message sent successfully', { localId: pending.localId });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await updateMessageStatus(pending.localId, 'failed', errorMessage);
      AppLogger.error('❌ Failed to send pending message:', new Error(errorMessage));
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
        AppLogger.debug('📡 Network connected, processing queue...');
    this.processQueue().catch((error) => AppLogger.error("Error processing queue", error instanceof Error ? error : new Error(String(error))));
      }
    });

    return unsubscribe;
  }
}

export const offlineMessageQueue = new OfflineMessageQueue();
