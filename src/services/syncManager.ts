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
