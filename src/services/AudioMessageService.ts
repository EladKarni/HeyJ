import { useCoreAudioPlaybackStore } from "../stores/audio/useCoreAudioPlaybackStore";
import { useAudioAutoplayStore } from "../stores/audio/useAudioAutoplayStore";
import { AudioPlayerStatus } from "@app-types/audio";
import AppLogger from "@/utilities/AppLogger";

export class AudioMessageService {
  static handlePlayerStatusChange(
    status: AudioPlayerStatus,
    updateMessageReadStatus?: (messageId: string) => void
  ): void {
    const { currentlyPlayingMessageId, autoplayEnabled } =
      useCoreAudioPlaybackStore.getState();
    const { playNextUnreadMessage } = useAudioAutoplayStore.getState();

    if (!currentlyPlayingMessageId) {
      // Update core store status
      useCoreAudioPlaybackStore.getState().setPlayerStatus(status);
      return;
    }

    const prevStatus = useCoreAudioPlaybackStore.getState().playerStatus;
    let playbackFinished = false;

    // Check if playback finished (reached the end)
    const reachedEndPrev =
      prevStatus?.duration &&
      prevStatus?.currentTime !== undefined &&
      prevStatus.duration > 0 &&
      prevStatus.currentTime >= prevStatus.duration - 0.1;

    const reachedEndCurrent =
      status?.duration &&
      status?.currentTime !== undefined &&
      status.duration > 0 &&
      status.currentTime >= status.duration - 0.1;

    if (
      !playbackFinished &&
      prevStatus?.playing && // Was playing
      !status?.playing && // Now stopped/paused
      (reachedEndPrev || reachedEndCurrent) // Reached the end
    ) {
      AppLogger.debug(
        "✅ Audio playback finished completely",
        currentlyPlayingMessageId
      );
      playbackFinished = true;
      // Clear currently playing message
      useCoreAudioPlaybackStore.getState().setCurrentlyPlaying(null, null, null);
    }

    // Also check current status in case we missed the transition
    if (
      !playbackFinished &&
      !status?.playing && // Not playing now
      reachedEndCurrent // At or past the end
    ) {
      AppLogger.debug(
        "✅ Audio playback finished (current status check)",
        currentlyPlayingMessageId
      );
      playbackFinished = true;
      // Clear currently playing message
      useCoreAudioPlaybackStore.getState().setCurrentlyPlaying(null, null, null);
    }

    // Continue autoplay sequence if playback finished and autoplay is enabled
    if (playbackFinished && autoplayEnabled) {
      AppLogger.debug("🔄 Continuing autoplay sequence...");
      setTimeout(() => {
        playNextUnreadMessage();
      }, 500);
    }

    // Update core store status
    useCoreAudioPlaybackStore.getState().setPlayerStatus(status);
  }
}
