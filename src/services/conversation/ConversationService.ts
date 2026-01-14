import { supabase } from "../../utilities/Supabase";
import Conversation from "../../objects/Conversation";
import Profile from "../../objects/Profile";
import { saveConversation } from "../../database/repositories/conversationRepository";
import { syncManager } from "../syncManager";
import AppLogger from "../../utilities/AppLogger";

export class ConversationService {
  static async fetchUserConversations(
    userId: string,
    conversationIds: string[],
    limit: number = 20
  ): Promise<Conversation[]> {
    try {
      console.log("🚀 fetchUserConversations starting", { userId, conversationIds, limit });
      
      
      
// On web, use cached conversations with fallback for missing conversations
      const isWeb = typeof window !== 'undefined';
      if (isWeb) {
        const cachedConversations = await syncManager.getCachedConversations(limit);
        
        // Check if cache contains all expected conversations
        const cachedIds = cachedConversations.map(c => c.conversationId);
        const missingConversations = conversationIds.filter(id => !cachedIds.includes(id));
        
        if (missingConversations.length > 0) {
          // Fetch missing conversations directly from Supabase and add to cached results
          const missingConvs = await this.getConversationsFromIds(missingConversations);
          const allConversations = [...cachedConversations, ...missingConvs];
          return allConversations;
        }
        
        return cachedConversations;
      } catch (cacheError) {
        AppLogger.error("Error fetching from cache", cacheError instanceof Error ? cacheError : new Error(String(cacheError)));
        return [];
      }
    }
  }

  static async getCachedConversations(
    limit: number = 20
  ): Promise<Conversation[]> {
    try {
      AppLogger.debug("Loading conversations from cache", { limit });
      const cachedConversations = await syncManager.getCachedConversations(
        limit
      );
      AppLogger.debug(
        `Loaded ${cachedConversations.length} conversations from cache`
      );
      return cachedConversations;
    } catch (error) {
      AppLogger.error(
        "Error fetching cached conversations:",
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  static async fetchConversationById(
    conversationId: string
  ): Promise<Conversation | null> {
    try {
      const { data: conversationData, error } = await supabase
        .from("conversations")
        .select()
        .eq("conversationId", conversationId);

      if (conversationData && conversationData[0]) {
        return await Conversation.fromJSON(conversationData[0]);
      }
      return null;
    } catch (error) {
      AppLogger.error(
        "Error fetching conversation:",
        error instanceof Error ? error : new Error(String(error))
      );
      return null;
    }
  }

  static async updateConversationInCache(
    conversation: Conversation
  ): Promise<void> {
    try {
      await saveConversation(conversation);
    } catch (error) {
      AppLogger.error(
        "Error updating conversation in cache:",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  static async fetchAllUserConversations(
    userId: string
  ): Promise<Conversation[]> {
    try {
      const { data: allConversations, error: fetchError } = await supabase
        .from("conversations")
        .select("*");

      if (!fetchError && allConversations) {
        // Filter conversations where user's UID is in uids array
        const userConversations = allConversations.filter((conv: any) => {
          const uids = conv.uids || [];
          return Array.isArray(uids) && uids.includes(userId);
        });

        const conversations: Conversation[] = [];
        for (const convData of userConversations) {
          try {
            const conversation = await Conversation.fromJSON(convData);
            conversations.push(conversation);
          } catch (error) {
            AppLogger.error(
              "Error processing conversation:",
              error instanceof Error ? error : new Error(String(error))
            );
          }
        }

        return conversations;
      }
      return [];
    } catch (error) {
      AppLogger.error(
        "Error fetching all conversations:",
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

  static async updateUserProfileConversations(
    userId: string,
    newConversationId: string
  ): Promise<void> {
    try {
      // First get current profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("conversations")
        .eq("uid", userId)
        .single();

      if (profileData) {
        const currentConversations = Array.isArray(profileData.conversations)
          ? profileData.conversations
          : [];

        if (!currentConversations.includes(newConversationId)) {
          AppLogger.debug(
            `Adding conversation ${newConversationId} to user profile`
          );
          await supabase
            .from("profiles")
            .update({
              conversations: [...currentConversations, newConversationId],
            })
            .eq("uid", userId);
        }
      }
    } catch (error) {
      AppLogger.error(
        "Error updating user profile conversations:",
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  static async refreshUserConversations(
    userId: string,
    conversationIds: string[],
    limit: number = 20
  ): Promise<Conversation[]> {
    try {
      const syncedConversations = await syncManager.syncConversations(
        { uid: userId, conversations: conversationIds } as any,
        conversationIds,
        limit
      );
      return syncedConversations;
    } catch (error) {
      AppLogger.error(
        "Error refreshing conversations:",
        error instanceof Error ? error : new Error(String(error))
      );
      return [];
    }
  }

static async getConversationsFromIds(
    conversationIds: string[]
  ): Promise<Conversation[]> {
    const conversations: Conversation[] = [];

    await Promise.all(
      conversationIds.map(async (id: string) => {
        try {
          console.log("🔍 Fetching conversation from Supabase:", { id });
          const { data: conversationData, error } = await supabase
            .from("conversations")
            .select()
            .eq("conversationId", id);

          if (conversationData && conversationData[0]) {
            console.log("✅ Successfully fetched conversation data:", { id, hasMessages: conversationData[0].messages?.length > 0 });
            const conversation = await Conversation.fromJSON(
              conversationData[0]
            );
            conversations.push(conversation);
          } else {
            console.log("❌ Conversation not found in Supabase:", { id });
          }
        } catch (error) {
          console.log("❌ Error fetching conversation from Supabase:", { id, error });
        }
      })
    );

    console.log("🎯 getConversationsFromIds result:", {
      requestedIds: conversationIds,
      fetchedCount: conversations.length,
      fetchedIds: conversations.map(c => c.conversationId)
    });

    return conversations;
  }
        } catch (error) {
          AppLogger.error(
            "Error fetching conversation:",
            error instanceof Error ? error : new Error(String(error))
          );
        }
      })
    );

    return conversations;
  }
}
