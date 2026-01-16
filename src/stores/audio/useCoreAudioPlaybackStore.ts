import { create } from "zustand";
import { AudioPlayer, AudioPlayerStatus } from "@app-types/audio";
import { playAudioFromUri } from "@services/audioService";
import { messageReadService } from "@services/MessageReadService";
import AppLogger from "@/utilities/AppLogger";

interface CoreAudioPlaybackState {
  currentlyPlayingConversationId: string | null;
  currentlyPlayingMessageId: string | null;
  currentlyPlayingUri: string | null;
  audioPlayer: AudioPlayer | null;
  playerStatus: AudioPlayerStatus | null;
  speakerMode: boolean;
  autoplayEnabled: boolean;

  // Actions
  setAudioPlayer: (player: AudioPlayer) => void;
  setPlayerStatus: (status: AudioPlayerStatus) => void;
  setCurrentlyPlaying: (
    conversationId: string | null,
    messageId: string | null,
    uri: string | null
  ) => void;
  clearCurrentlyPlaying: () => void;
  setSpeakerMode: (enabled: boolean) => void;
  setAutoplayEnabled: (enabled: boolean) => void;
  playFromUri: (
    uri: string,
    conversationId?: string,
    audioPlayer?: AudioPlayer,
    messageId?: string,
    updateMessageReadStatus?: (messageId: string) => void,
    rollbackMessageReadStatus?: (messageId: string) => void
  ) => Promise<void>;
}

export const useCoreAudioPlaybackStore = create<CoreAudioPlaybackState>(
  (set, get) => ({
    currentlyPlayingConversationId: null,
    currentlyPlayingMessageId: null,
    currentlyPlayingUri: null,
    audioPlayer: null,
    playerStatus: null,
    speakerMode: false,
    autoplayEnabled: false,

    setAudioPlayer: (player) => set({ audioPlayer: player }),

    setPlayerStatus: (status) => {
      const prevStatus = get().playerStatus;
      const messageId = get().currentlyPlayingMessageId;

      // Add debug logging for playback status changes
      if (messageId && prevStatus?.playing !== status?.playing) {
        AppLogger.debug("🔊 Playback status changed:", {
          messageId,
          wasPlaying: prevStatus?.playing,
          nowPlaying: status?.playing,
          prevTime: prevStatus?.currentTime,
          prevDuration: prevStatus?.duration,
          currentTime: status?.currentTime,
          currentDuration: status?.duration,
        });
      }

      set({ playerStatus: status });
    },

    setCurrentlyPlaying: (conversationId, messageId, uri) =>
      set({
        currentlyPlayingConversationId: conversationId,
        currentlyPlayingMessageId: messageId,
        currentlyPlayingUri: uri,
      }),

    clearCurrentlyPlaying: () =>
      set({
        currentlyPlayingConversationId: null,
        currentlyPlayingMessageId: null,
        currentlyPlayingUri: null,
      }),

    setSpeakerMode: (enabled) => set({ speakerMode: enabled }),

    setAutoplayEnabled: (enabled) => set({ autoplayEnabled: enabled }),

    playFromUri: async (uri, conversationId, audioPlayer, messageId, updateMessageReadStatus, rollbackMessageReadStatus) => {
      try {
        const player = audioPlayer || get().audioPlayer;
        if (!player) {
          AppLogger.error("No audio player available");
          return;
        }

        // Set currently playing info
        get().setCurrentlyPlaying(
          conversationId || null,
          messageId || null,
          uri
        );

        // Mark message as read using centralized service with optimistic updates
        // This is the ONLY place that marks messages as read during playback
        if (messageId && updateMessageReadStatus && rollbackMessageReadStatus) {
          // Check if already marked recently to prevent duplicates
          if (!messageReadService.wasRecentlyMarked(messageId)) {
            AppLogger.debug("📖 Marking message as read on playback start:", messageId);
            await messageReadService.markAsRead(
              messageId,
              updateMessageReadStatus,
              rollbackMessageReadStatus
            );
          } else {
            AppLogger.debug("⏭️ Skipping mark - already marked recently:", messageId);
          }
        }

        // Play the audio
        await playAudioFromUri(uri, player);
      } catch (error) {
        AppLogger.error("Error playing audio:", error instanceof Error ? error : new Error(String(error)));
        get().clearCurrentlyPlaying();
      }
    },
  })
);
