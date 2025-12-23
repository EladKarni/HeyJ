import { supabase } from "../../utilities/Supabase";
import Conversation from "../../objects/Conversation";
import { logAgentEvent } from "../../utilities/AgentLogger";
import { saveConversation } from "../../database/repositories/conversationRepository";
import { RealtimeChannel } from "@supabase/supabase-js";

export class ConversationSubscriptionService {
  private static channels = new Map<string, RealtimeChannel>();

  /**
   * Simple subscription approach to avoid infinite loops
   */
  static async subscribeToConversations(
    conversationIds: string[],
    onConversationUpdate: (conversationId: string, updatedConversation: Conversation) => void
  ): Promise<void> {
    // Clean up old subscriptions
    this.cleanupOldSubscriptions(conversationIds);

    // Create subscriptions for new conversations
    for (const conversationId of conversationIds) {
      if (this.channels.has(conversationId)) {
        continue;
      }

      logAgentEvent({
        location: 'ConversationSubscriptionService:subscribeToConversations',
        message: 'setting up subscription for new conversation',
        data: { conversationId },
        hypothesisId: 'C',
      });

      try {
        const channel = supabase.channel(conversationId + "_conversation");

        channel
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "conversations",
              filter: "conversationId=eq." + conversationId,
            },
            async (payload) => {
              logAgentEvent({
                location: 'ConversationSubscriptionService:subscribeToConversations:channel.on',
                message: 'conversation real-time update received',
                data: {
                  conversationId,
                  eventType: payload.eventType,
                  newMessages: (payload.new as any)?.messages?.length || 0,
                  oldMessages: (payload.old as any)?.messages?.length || 0,
                },
                hypothesisId: 'B',
              });

              const updatedConversation = await this.fetchUpdatedConversation(conversationId);
              if (updatedConversation) {
                logAgentEvent({
                  location: 'ConversationSubscriptionService:subscribeToConversations:channel.on',
                  message: 'conversation updated locally',
                  data: {
                    conversationId,
                    messageCount: updatedConversation.messages.length,
                  },
                  hypothesisId: 'B',
                });

                // Notify parent component of the update
                onConversationUpdate(conversationId, updatedConversation);

                // Update cache
                await saveConversation(updatedConversation);
              }
            }
          )
          .subscribe((status) => {
            logAgentEvent({
              location: 'ConversationSubscriptionService:subscribeToConversations:subscribe',
              message: 'conversation subscription status',
              data: { conversationId, status },
              hypothesisId: 'B',
            });
            if (status === "SUBSCRIBED") {
              logAgentEvent({
                location: 'ConversationSubscriptionService:subscribeToConversations:subscribe',
                message: 'conversation subscription active',
                data: { conversationId },
                hypothesisId: 'B',
              });
            }
          });
        
        this.channels.set(conversationId, channel);
      } catch (error) {
        console.error("Error setting up conversation subscription:", error);
      }
    }
  }

  static unsubscribeAll(): void {
    this.channels.forEach((channel) => {
      supabase.removeChannel(channel);
    });
    this.channels.clear();
  }

  private static cleanupOldSubscriptions(activeConversationIds: string[]): void {
    this.channels.forEach((channel, id) => {
      if (!activeConversationIds.includes(id)) {
        supabase.removeChannel(channel);
        this.channels.delete(id);
      }
    });
  }

  private static async fetchUpdatedConversation(conversationId: string): Promise<Conversation | null> {
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
      console.error("Error fetching updated conversation:", error);
      return null;
    }
  }

  static getSubscriptionCount(): number {
    return this.channels.size;
  }

  static hasSubscription(conversationId: string): boolean {
    return this.channels.has(conversationId);
  }

  static getSubscribedConversations(): string[] {
    return Array.from(this.channels.keys());
  }
}