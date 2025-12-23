import { create } from "zustand";
import Conversation from "@objects/Conversation";
import { AudioPlayer } from "@app-types/audio";
import { useCoreAudioPlaybackStore } from "./useCoreAudioPlaybackStore";
import { getUnreadMessagesFromOtherUser } from "@utilities/conversationUtils";
import AppLogger from "@/utilities/AppLogger";

interface AutoplayState {
  conversations: Conversation[];
  profileId: string | undefined;
  lastMessageCounts: Record<string, number>;

  // Actions
  setConversations: (conversations: Conversation[]) => void;
  setProfileId: (profileId: string | undefined) => void;
  updateMessageCount: (conversationId: string, count: number) => void;
  handleAutoPlay: (
    conversations: Conversation[],
    autoplay: boolean,
    profileId: string | undefined,
    audioPlayer: AudioPlayer
  ) => void;
  playNextUnreadMessage: () => void;
}

export const useAudioAutoplayStore = create<AutoplayState>((set, get) => ({
  conversations: [],
  profileId: undefined,
  lastMessageCounts: {},

  setConversations: (conversations) => set({ conversations }),

  setProfileId: (profileId) => set({ profileId }),

  updateMessageCount: (conversationId, count) =>
    set((state) => ({
      lastMessageCounts: {
        ...state.lastMessageCounts,
        [conversationId]: count,
      },
    })),

  handleAutoPlay: (conversations, autoplay, profileId, audioPlayer) => {
    if (!profileId) return;

    // Defensive checks for conversations array
    if (!Array.isArray(conversations)) {
      AppLogger.error("handleAutoPlay: conversations is not an array", { conversations, type: typeof conversations });
      return;
    }

    // Filter out invalid conversations
    const validConversations = conversations.filter((conversation) => {
      if (!conversation) {
        AppLogger.warn("Skipping undefined conversation in autoplay");
        return false;
      }
      if (!conversation.messages) {
        AppLogger.warn("Skipping conversation with undefined messages", { conversationId: conversation.conversationId });
        return false;
      }
      if (!Array.isArray(conversation.messages)) {
        AppLogger.warn("Skipping conversation with non-array messages", { conversationId: conversation.conversationId, messagesType: typeof conversation.messages });
        return false;
      }
      return true;
    });

    set({ conversations: validConversations, profileId });

    validConversations.forEach((conversation) => {
      const lastCount = get().lastMessageCounts[conversation.conversationId];
      const unheardMessages = getUnreadMessagesFromOtherUser(
        conversation.messages,
        profileId
      );
      const currentCount = unheardMessages.length;

      // Determine if this is initial app load
      const isInitialLoad = Object.keys(get().lastMessageCounts).length === 0;

      if (currentCount === 0) {
        // No unread messages
        if (lastCount && lastCount > 0) {
          AppLogger.debug("🔕 All messages caught up");
        }
        return;
      }

      if (
        currentCount > (lastCount || 0) && // New messages
        autoplay && // Autoplay enabled
        get().conversations.length > 0 // Not initial load (conversations already set)
      ) {
        // Newest message autoplay
        const newestUnheard = unheardMessages[unheardMessages.length - 1];
        AppLogger.debug("🔔 New message, autoplaying newest:", {
          messageId: newestUnheard.messageId,
          uri: newestUnheard.audioUrl,
          conversationId: conversation.conversationId,
        });
        useCoreAudioPlaybackStore
          .getState()
          .playFromUri(
            newestUnheard.audioUrl,
            conversation.conversationId,
            audioPlayer!,
            newestUnheard.messageId
          );
      } else if (lastCount === undefined || isInitialLoad) {
        // First time seeing this conversation OR initial app load - autoplay OLDEST unread message
        const oldestUnheard = unheardMessages[0];
        AppLogger.debug("🔔 First load with unread message(s), autoplaying oldest:", {
          messageId: oldestUnheard.messageId,
          unreadCount: unheardMessages.length,
          loadType: isInitialLoad ? "[INITIAL APP LOAD]" : "[NEW CONVERSATION]"
        });
        useCoreAudioPlaybackStore
          .getState()
          .playFromUri(
            oldestUnheard.audioUrl,
            conversation.conversationId,
            audioPlayer,
            oldestUnheard.messageId
          );
      } else if (
        useCoreAudioPlaybackStore.getState().currentlyPlayingConversationId ===
          null &&
        lastCount !== undefined
      ) {
        // Autoplay was re-enabled and nothing is currently playing - start from oldest unread
        const oldestUnheard = unheardMessages[0];
        AppLogger.debug("🔔 Autoplay re-enabled, starting from oldest unread:", {
          messageId: oldestUnheard.messageId,
          unreadCount: unheardMessages.length
        });
        useCoreAudioPlaybackStore
          .getState()
          .playFromUri(
            oldestUnheard.audioUrl,
            conversation.conversationId,
            audioPlayer,
            oldestUnheard.messageId
          );
      }

      // Always update message count
      get().updateMessageCount(conversation.conversationId, currentCount);
    });
  },

  playNextUnreadMessage: () => {
    const { conversations, profileId } = get();
    const { currentlyPlayingConversationId } =
      useCoreAudioPlaybackStore.getState();

    if (!profileId || conversations.length === 0) return;

    // Find current conversation and next unread message
    const currentConversationIndex = conversations.findIndex(
      (conv) => conv.conversationId === currentlyPlayingConversationId
    );

    // Look for unread messages in current conversation first
    if (currentConversationIndex !== -1) {
      const currentConversation = conversations[currentConversationIndex];
      const unheardMessages = getUnreadMessagesFromOtherUser(
        currentConversation.messages,
        profileId
      );

      if (unheardMessages.length > 0) {
        const nextMessage = unheardMessages[0];
        useCoreAudioPlaybackStore
          .getState()
          .playFromUri(
            nextMessage.audioUrl,
            currentConversation.conversationId,
            useCoreAudioPlaybackStore.getState().audioPlayer!,
            nextMessage.messageId
          );
        return;
      }
    }

    // Look for unread messages in subsequent conversations
    for (let i = currentConversationIndex + 1; i < conversations.length; i++) {
      const conversation = conversations[i];
      const unheardMessages = getUnreadMessagesFromOtherUser(
        conversation.messages,
        profileId
      );

      if (unheardMessages.length > 0) {
        const nextMessage = unheardMessages[0];
        useCoreAudioPlaybackStore
          .getState()
          .playFromUri(
            nextMessage.audioUrl,
            conversation.conversationId,
            useCoreAudioPlaybackStore.getState().audioPlayer!,
            nextMessage.messageId
          );
        return;
      }
    }

    AppLogger.debug("🔔 No more unread messages found");
  },
}));
