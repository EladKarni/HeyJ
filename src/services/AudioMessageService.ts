import { useCoreAudioPlaybackStore } from "../stores/audio/useCoreAudioPlaybackStore";
import { useAudioAutoplayStore } from "../stores/audio/useAudioAutoplayStore";
import { markMessageAsRead } from "../utilities/MarkMessageAsRead";
import { AudioPlayerStatus } from "@app-types/audio";
import Conversation from "../objects/Conversation";
import Message from "../objects/Message";
import AppLogger from "@/utilities/AppLogger";

export class AudioMessageService {
  static handlePlayerStatusChange(
    status: AudioPlayerStatus,
    updateMessageReadStatus?: (messageId: string) => void
  ): void {
    const { currentlyPlayingMessageId, autoplayEnabled } =
      useCoreAudioPlaybackStore.getState();
    const { playNextUnreadMessage } = useAudioAutoplayStore.getState();

    if (!currentlyPlayingMessageId) return;

    const prevStatus = useCoreAudioPlaybackStore.getState().playerStatus;
    let playbackFinished = false;

    // Mark message as read when playback finishes (reaches the end)
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
        "✅ Audio playback finished completely - marking message as read:",
        currentlyPlayingMessageId
      );
      this.markMessageAsReadAndContinue(
        currentlyPlayingMessageId,
        updateMessageReadStatus
      );
      playbackFinished = true;
    }

    // Also check current status in case we missed the transition
    if (
      !playbackFinished &&
      !status?.playing && // Not playing now
      reachedEndCurrent // At or past the end
    ) {
      AppLogger.debug(
        "✅ Audio playback finished (current status check) - marking message as read:",
        currentlyPlayingMessageId
      );
      this.markMessageAsReadAndContinue(
        currentlyPlayingMessageId,
        updateMessageReadStatus
      );
      playbackFinished = true;
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

  private static markMessageAsReadAndContinue(
    messageId: string,
    updateMessageReadStatus?: (messageId: string) => void
  ): void {
    markMessageAsRead(messageId).then((success) => {
      if (success) {
        AppLogger.debug(
          "✅ Message marked as read, updating conversation state"
        );
        if (updateMessageReadStatus) {
          updateMessageReadStatus(messageId);
          AppLogger.debug("✅ ConversationsProvider state updated");
        } else {
          AppLogger.debug(
            "⚠️ updateMessageReadStatus not available, updating store only"
          );
        }
        AppLogger.debug("✅ Continuing autoplay sequence");
      } else {
        AppLogger.debug(
          "⚠️ Failed to mark message as read, but continuing autoplay sequence"
        );
      }
    });

    // Clear messageId after marking as read
    useCoreAudioPlaybackStore.getState().setCurrentlyPlaying(null, null, null);
  }

  static updateConversationMessageReadStatus(
    conversations: Conversation[],
    conversationId: string,
    messageId: string
  ): Conversation[] {
    return conversations.map((conv) => {
      if (conv.conversationId === conversationId) {
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
      }
      return conv;
    });
  }
}
