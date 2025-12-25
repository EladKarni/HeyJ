import { create } from "zustand";
import { AudioPlayer, AudioPlayerStatus } from "@app-types/audio";
import Conversation from "@objects/Conversation";
import { useCoreAudioPlaybackStore } from "./audio/useCoreAudioPlaybackStore";
import { useAudioAutoplayStore } from "./audio/useAudioAutoplayStore";
import { AudioMessageService } from "../services/AudioMessageService";
import { NotificationAudioService } from "../services/NotificationAudioService";

interface AudioPlaybackState {
  // Combine core audio properties
  currentlyPlayingConversationId: string | null;
  currentlyPlayingMessageId: string | null;
  currentlyPlayingUri: string | null;
  audioPlayer: AudioPlayer | null;
  playerStatus: AudioPlayerStatus | null;
  autoplayEnabled: boolean;
  conversations: Conversation[];
  profileId: string | undefined;
  updateMessageReadStatus: ((messageId: string) => void) | undefined;
  speakerMode: boolean;
  lastMessageCounts: Record<string, number>;
  
  // Core actions
  setAudioPlayer: (player: AudioPlayer) => void;
  setPlayerStatus: (status: AudioPlayerStatus) => void;
  setCurrentlyPlaying: (conversationId: string | null) => void;
  clearCurrentlyPlaying: () => void;
  updateMessageCount: (conversationId: string, count: number) => void;
  
  // Audio playback actions
  playFromUri: (uri: string, conversationId?: string, audioPlayer?: AudioPlayer, messageId?: string) => Promise<void>;
  
  // Autoplay actions
  handleAutoPlay: (
    conversations: Conversation[],
    autoplay: boolean,
    profileId: string | undefined,
    audioPlayer: AudioPlayer,
    updateMessageReadStatus?: (messageId: string) => void,
    speakerMode?: boolean
  ) => void;
  playNextUnreadMessage: () => void;
  
  // Notification actions
  initializeNotificationHandlers: (
    setSelectedConversation: (id: string) => void,
    profileId: string,
    audioPlayer: AudioPlayer,
    navigateToConversation?: (conversationId: string) => void,
    updateMessageReadStatus?: (messageId: string) => void
  ) => () => void;
}

export const useAudioPlaybackStore = create<AudioPlaybackState>((set, get) => ({
  // Get state from core stores
  currentlyPlayingConversationId: useCoreAudioPlaybackStore.getState().currentlyPlayingConversationId,
  currentlyPlayingMessageId: useCoreAudioPlaybackStore.getState().currentlyPlayingMessageId,
  currentlyPlayingUri: useCoreAudioPlaybackStore.getState().currentlyPlayingUri,
  audioPlayer: useCoreAudioPlaybackStore.getState().audioPlayer,
  playerStatus: useCoreAudioPlaybackStore.getState().playerStatus,
  autoplayEnabled: useCoreAudioPlaybackStore.getState().autoplayEnabled,
  speakerMode: useCoreAudioPlaybackStore.getState().speakerMode,
  conversations: useAudioAutoplayStore.getState().conversations,
  profileId: useAudioAutoplayStore.getState().profileId,
  updateMessageReadStatus: undefined,
  lastMessageCounts: useAudioAutoplayStore.getState().lastMessageCounts,

  // Core actions - delegate to core store
  setAudioPlayer: (player) => {
    useCoreAudioPlaybackStore.getState().setAudioPlayer(player);
    set({ audioPlayer: player });
  },

  setPlayerStatus: (status) => {
    const { updateMessageReadStatus } = get();
    // Use service to handle player status changes
    AudioMessageService.handlePlayerStatusChange(status, updateMessageReadStatus);
    
    // Update local state
    set({ 
      playerStatus: status,
      currentlyPlayingConversationId: useCoreAudioPlaybackStore.getState().currentlyPlayingConversationId,
      currentlyPlayingMessageId: useCoreAudioPlaybackStore.getState().currentlyPlayingMessageId,
      currentlyPlayingUri: useCoreAudioPlaybackStore.getState().currentlyPlayingUri,
    });
  },

  setCurrentlyPlaying: (conversationId) => {
    useCoreAudioPlaybackStore.getState().setCurrentlyPlaying(conversationId, null, null);
    set({ 
      currentlyPlayingConversationId: conversationId,
      currentlyPlayingMessageId: null,
      currentlyPlayingUri: null
    });
  },

  clearCurrentlyPlaying: () => {
    useCoreAudioPlaybackStore.getState().clearCurrentlyPlaying();
    set({ 
      currentlyPlayingConversationId: null,
      currentlyPlayingMessageId: null,
      currentlyPlayingUri: null
    });
  },

  updateMessageCount: (conversationId, count) => {
    useAudioAutoplayStore.getState().updateMessageCount(conversationId, count);
    set({ lastMessageCounts: useAudioAutoplayStore.getState().lastMessageCounts });
  },

  // Audio playback actions - delegate to core store
  playFromUri: async (uri, conversationId, audioPlayer, messageId) => {
    await useCoreAudioPlaybackStore.getState().playFromUri(uri, conversationId, audioPlayer, messageId);
    
    // Update local state
    set({ 
      currentlyPlayingConversationId: useCoreAudioPlaybackStore.getState().currentlyPlayingConversationId,
      currentlyPlayingMessageId: useCoreAudioPlaybackStore.getState().currentlyPlayingMessageId,
      currentlyPlayingUri: useCoreAudioPlaybackStore.getState().currentlyPlayingUri,
    });
  },

  // Autoplay actions - delegate to autoplay store
  handleAutoPlay: (conversations, autoplay, profileId, audioPlayer, updateMessageReadStatus, speakerMode) => {
    set({ 
      conversations,
      profileId,
      updateMessageReadStatus,
      speakerMode: speakerMode || false,
      autoplayEnabled: autoplay
    });
    
    useAudioAutoplayStore.getState().handleAutoPlay(conversations, autoplay, profileId, audioPlayer);
    useCoreAudioPlaybackStore.getState().setAutoplayEnabled(autoplay);
    useCoreAudioPlaybackStore.getState().setSpeakerMode(speakerMode || false);
  },

  playNextUnreadMessage: () => {
    useAudioAutoplayStore.getState().playNextUnreadMessage();
    
    // Update local state
    set({ 
      currentlyPlayingConversationId: useCoreAudioPlaybackStore.getState().currentlyPlayingConversationId,
      currentlyPlayingMessageId: useCoreAudioPlaybackStore.getState().currentlyPlayingMessageId,
      currentlyPlayingUri: useCoreAudioPlaybackStore.getState().currentlyPlayingUri,
    });
  },

  // Notification actions - delegate to notification service
  initializeNotificationHandlers: (setSelectedConversation, profileId, audioPlayer, navigateToConversation, updateMessageReadStatus) => {
    return NotificationAudioService.initializeNotificationHandlers(setSelectedConversation, profileId, navigateToConversation, updateMessageReadStatus);
  },
}));