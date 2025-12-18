import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { supabase } from "./Supabase";
import Conversation from "../objects/Conversation";
import Message from "../objects/Message";
import Profile from "../objects/Profile";
import { useProfile } from "./ProfileProvider";
import { logAgentEvent } from "./AgentLogger";

interface ConversationsContextType {
  conversations: Conversation[];
  profiles: Profile[];
  getConversations: () => Promise<void>;
  updateMessageReadStatus: (messageId: string) => void;
}

const ConversationsContext = createContext<ConversationsContextType | null>(null);

export const ConversationsProvider = ({ children }: { children: React.ReactNode }) => {
  logAgentEvent({
    location: 'ConversationsProvider.tsx:ConversationsProvider',
    message: 'ConversationsProvider rendering',
    data: {},
    hypothesisId: 'A',
  });
  let profile;
  try {
    const profileContext = useProfile();
    profile = profileContext.profile;
    logAgentEvent({
      location: 'ConversationsProvider.tsx:ConversationsProvider',
      message: 'ConversationsProvider useProfile success',
      data: { hasProfile: !!profile },
      hypothesisId: 'A',
    });
  } catch (error) {
    logAgentEvent({
      location: 'ConversationsProvider.tsx:ConversationsProvider',
      message: 'ConversationsProvider useProfile error',
      data: {
        errorMessage: error instanceof Error ? error.message : String(error),
        errorStack: error instanceof Error ? error.stack : undefined,
      },
      hypothesisId: 'A',
    });
    throw error;
  }
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const conversationChannelsRef = useRef<Map<string, any>>(new Map());

  const getConversations = async () => {
    if (!profile) {
      setConversations([]);
      return;
    }

    let conversations: Conversation[] = [];
    const conversationIdsSet = new Set<string>();

    // First, fetch conversations from profile.conversations array (if it exists)
    if (profile.conversations && profile.conversations.length > 0) {
      await Promise.all(
        profile.conversations.map(async (id: string) => {
          try {
            const { data: conversationData, error } = await supabase
              .from("conversations")
              .select()
              .eq("conversationId", id);

            if (conversationData && conversationData[0]) {
              const conversation = await Conversation.fromJSON(conversationData[0]);
              conversations.push(conversation);
              conversationIdsSet.add(id);
            }
          } catch (error) {
            console.error("Error fetching conversation:", error);
          }
        })
      );
    }

    // Also fetch all conversations where the user is a participant
    // This handles cases where conversations exist in DB but aren't in profile.conversations yet
    try {
      const { data: allConversations, error: fetchError } = await supabase
        .from("conversations")
        .select("*");

      if (!fetchError && allConversations) {
        // Filter conversations where the user's UID is in the uids array
        const userConversations = allConversations.filter((conv: any) => {
          const uids = conv.uids || [];
          return Array.isArray(uids) && uids.includes(profile.uid);
        });

        // Fetch any conversations we haven't already loaded
        await Promise.all(
          userConversations.map(async (convData: any) => {
            const convId = convData.conversationId;
            if (!conversationIdsSet.has(convId)) {
              try {
                const conversation = await Conversation.fromJSON(convData);
                conversations.push(conversation);
                conversationIdsSet.add(convId);
                
                // Update profile.conversations if it's missing this conversation
                const currentConversations = Array.isArray(profile.conversations)
                  ? profile.conversations
                  : [];
                if (!currentConversations.includes(convId)) {
                  console.log(`📝 Found conversation ${convId} not in profile.conversations, updating profile...`);
                  await supabase
                    .from("profiles")
                    .update({
                      conversations: [...currentConversations, convId],
                    })
                    .eq("uid", profile.uid);
                }
              } catch (error) {
                console.error("Error processing conversation:", error);
              }
            }
          })
        );
      }
    } catch (error) {
      console.error("Error fetching all conversations:", error);
    }

    setConversations(conversations);
  };

  useEffect(() => {
    if (profile) {
      logAgentEvent({
        location: 'ConversationsProvider.tsx:useEffect[profile]',
        message: 'profile changed, calling getConversations',
        data: {
          profileUid: profile.uid,
          conversationIds: profile.conversations || [],
          conversationCount: profile.conversations?.length || 0,
        },
        hypothesisId: 'C',
      });
      getConversations();
    }
  }, [profile]);

  const updateConversations = async () => {
    logAgentEvent({
      location: 'ConversationsProvider.tsx:updateConversations',
      message: 'updateConversations called',
      data: {
        hasProfile: !!profile,
        conversationIds: profile?.conversations || [],
        conversationCount: profile?.conversations?.length || 0,
        existingSubscriptions: Array.from(conversationChannelsRef.current.keys()),
      },
      hypothesisId: 'C',
    });
    if (!profile || !profile.conversations || profile.conversations.length === 0) {
      // Clean up all subscriptions if no conversations
      conversationChannelsRef.current.forEach((channel, id) => {
        supabase.removeChannel(channel);
        conversationChannelsRef.current.delete(id);
      });
      return;
    }

    // Remove subscriptions for conversations that are no longer in the profile
    const currentConversationIds = new Set(profile.conversations);
    conversationChannelsRef.current.forEach((channel, id) => {
      if (!currentConversationIds.has(id)) {
        supabase.removeChannel(channel);
        conversationChannelsRef.current.delete(id);
      }
    });

    // Add subscriptions for new conversations
    profile.conversations.forEach((id: string) => {
      // Skip if subscription already exists
      if (conversationChannelsRef.current.has(id)) {
        logAgentEvent({
          location: 'ConversationsProvider.tsx:updateConversations',
          message: 'subscription already exists for conversation',
          data: { conversationId: id },
          hypothesisId: 'C',
        });
        return;
      }

      logAgentEvent({
        location: 'ConversationsProvider.tsx:updateConversations',
        message: 'setting up subscription for new conversation',
        data: { conversationId: id },
        hypothesisId: 'C',
      });
      try {
        const channel = supabase.channel(id + "_conversation");

        channel
          .on(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "conversations",
              filter: "conversationId=eq." + id,
            },
            async (payload) => {
              logAgentEvent({
                location: 'ConversationsProvider.tsx:updateConversations:channel.on',
                message: 'conversation real-time update received',
                data: {
                  conversationId: id,
                  eventType: payload.eventType,
                  newMessages: payload.new?.messages?.length || 0,
                  oldMessages: payload.old?.messages?.length || 0,
                },
                hypothesisId: 'B',
              });
              const { data: conversationData, error } = await supabase
                .from("conversations")
                .select()
                .eq("conversationId", id);

              if (conversationData && conversationData[0]) {
                const updatedConversation = await Conversation.fromJSON(
                  conversationData[0]
                );
                logAgentEvent({
                  location: 'ConversationsProvider.tsx:updateConversations:channel.on',
                  message: 'conversation updated locally',
                  data: {
                    conversationId: id,
                    messageCount: updatedConversation.messages.length,
                  },
                  hypothesisId: 'B',
                });

                setConversations((prevConversations) => {
                  const existing = prevConversations.find(c => c.conversationId === id);
                  if (!existing) {
                    // New conversation, add it
                    logAgentEvent({
                      location: 'ConversationsProvider.tsx:updateConversations:setConversations',
                      message: 'adding new conversation from real-time update',
                      data: {
                        conversationId: id,
                        messageCount: updatedConversation.messages.length,
                        previousConversationsCount: prevConversations.length,
                      },
                      hypothesisId: 'B',
                    });
                    return [...prevConversations, updatedConversation];
                  }
                  // Update existing conversation
                  logAgentEvent({
                    location: 'ConversationsProvider.tsx:updateConversations:setConversations',
                    message: 'updating existing conversation from real-time update',
                    data: {
                      conversationId: id,
                      oldMessageCount: existing.messages.length,
                      newMessageCount: updatedConversation.messages.length,
                    },
                    hypothesisId: 'B',
                  });
                  return prevConversations.map((c) =>
                    c.conversationId === id ? updatedConversation : c
                  );
                });
              }
            }
          )
          .subscribe((status) => {
            logAgentEvent({
              location: 'ConversationsProvider.tsx:updateConversations:subscribe',
              message: 'conversation subscription status',
              data: { conversationId: id, status },
              hypothesisId: 'B',
            });
            if (status === "SUBSCRIBED") {
              logAgentEvent({
                location: 'ConversationsProvider.tsx:updateConversations:subscribe',
                message: 'conversation subscription active',
                data: { conversationId: id },
                hypothesisId: 'B',
              });
            }
          });
        
        conversationChannelsRef.current.set(id, channel);
      } catch (error) {
        console.error("Error setting up conversation subscription:", error);
      }
    });
  };

  useEffect(() => {
    if (profile) {
      updateConversations();
    }
    
    // Cleanup on unmount
    return () => {
      conversationChannelsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      conversationChannelsRef.current.clear();
    };
  }, [profile]);

  const getProfiles = async () => {
    if (!conversations || conversations.length === 0) {
      setProfiles([]);
      return;
    }

    let profiles: Profile[] = [];

    await Promise.all(
      conversations.map(async (c) => {
        const uid = c.uids.filter((id) => id !== profile?.uid)[0];

        if (!uid) {
          return;
        }

        try {
          const { data, error } = await supabase
            .from("profiles")
            .select()
            .eq("uid", uid);

          if (data && data[0]) {
            profiles.push(Profile.fromJSON(data[0]));
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      })
    );

    setProfiles(profiles);
  };

  const updateMessageReadStatus = (messageId: string) => {
    setConversations((prevConversations) => {
      return prevConversations.map((conv) => {
        const messageIndex = conv.messages.findIndex(
          (m) => m.messageId === messageId
        );

        if (messageIndex !== -1) {
          const updatedMessages = [...conv.messages];
          const originalMessage = updatedMessages[messageIndex];
          // Create a new Message instance with updated isRead property
          updatedMessages[messageIndex] = new Message(
            originalMessage.messageId,
            originalMessage.timestamp,
            originalMessage.uid,
            originalMessage.audioUrl,
            true // isRead = true
          );

          // Create a new Conversation instance with updated messages
          return new Conversation(
            conv.conversationId,
            conv.uids,
            updatedMessages,
            conv.lastRead
          );
        }

        return conv;
      });
    });
  };

  useEffect(() => {
    getProfiles();
  }, [conversations]);

  return (
    <ConversationsContext.Provider
      value={{
        conversations,
        profiles,
        getConversations,
        updateMessageReadStatus,
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

