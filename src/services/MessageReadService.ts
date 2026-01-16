import { markMessageAsRead } from "@utilities/MarkMessageAsRead";
import AppLogger from "@/utilities/AppLogger";

/**
 * Centralized service for marking messages as read with optimistic updates.
 * This is the SINGLE SOURCE OF TRUTH for message read status updates.
 *
 * Key features:
 * - Optimistic local state updates (immediate UI feedback)
 * - Database synchronization with rollback on failure
 * - Deduplication to prevent multiple marks of same message
 * - Prevents concurrent marks via promise tracking
 */
class MessageReadService {
  // Track messages marked in last 2 seconds to prevent duplicates
  private recentlyMarkedMessages: Set<string> = new Set();

  // Track in-progress marking operations to prevent concurrent duplicates
  private markingInProgress: Map<string, Promise<boolean>> = new Map();

  /**
   * Mark a message as read with optimistic update and rollback support.
   *
   * Flow:
   * 1. Check if already marked recently → skip if yes
   * 2. Check if mark in progress → return existing promise
   * 3. Optimistically update local state immediately
   * 4. Update database
   * 5. On success → clear tracking after 2 seconds
   * 6. On failure → rollback local state
   *
   * @param messageId - ID of message to mark as read
   * @param updateLocalState - Callback to optimistically update local React state
   * @param rollbackLocalState - Callback to revert local state if database fails
   * @returns Promise<boolean> - true if successfully marked, false otherwise
   */
  async markAsRead(
    messageId: string,
    updateLocalState: (messageId: string) => void,
    rollbackLocalState: (messageId: string) => void
  ): Promise<boolean> {
    // Check if this message was recently marked (within 2 seconds)
    if (this.wasRecentlyMarked(messageId)) {
      AppLogger.debug("⏭️ Skipping mark - already marked recently:", messageId);
      return true; // Already marked, consider it successful
    }

    // Check if a mark is already in progress for this message
    const existingPromise = this.markingInProgress.get(messageId);
    if (existingPromise) {
      AppLogger.debug("⏳ Mark already in progress, waiting for completion:", messageId);
      return existingPromise;
    }

    // Create the marking promise
    const markingPromise = this.performMark(
      messageId,
      updateLocalState,
      rollbackLocalState
    );

    // Track this operation
    this.markingInProgress.set(messageId, markingPromise);

    // Clean up tracking when done
    markingPromise.finally(() => {
      this.markingInProgress.delete(messageId);
    });

    return markingPromise;
  }

  /**
   * Perform the actual marking operation with optimistic update.
   * @private
   */
  private async performMark(
    messageId: string,
    updateLocalState: (messageId: string) => void,
    rollbackLocalState: (messageId: string) => void
  ): Promise<boolean> {
    AppLogger.debug("📖 MessageReadService: Starting optimistic mark for:", messageId);

    // Step 1: Optimistically update local state immediately (instant UI feedback)
    try {
      updateLocalState(messageId);
      AppLogger.debug("✅ Optimistic update applied for:", messageId);
    } catch (error) {
      AppLogger.error("❌ Failed to apply optimistic update:", error);
      return false;
    }

    // Step 2: Update database
    let databaseSuccess = false;
    try {
      databaseSuccess = await markMessageAsRead(messageId);
    } catch (error) {
      AppLogger.error("❌ Exception during database update:", error);
      databaseSuccess = false;
    }

    // Step 3: Handle result
    if (databaseSuccess) {
      // Success! Track as recently marked to prevent duplicates
      this.recentlyMarkedMessages.add(messageId);
      AppLogger.debug("✅ MessageReadService: Mark successful for:", messageId);

      // Clear from recently marked after 2 seconds
      setTimeout(() => {
        this.recentlyMarkedMessages.delete(messageId);
        AppLogger.debug("🧹 Cleared recently marked flag for:", messageId);
      }, 2000);

      return true;
    } else {
      // Database update failed - rollback the optimistic update
      AppLogger.error("❌ Database update failed, rolling back for:", messageId);
      try {
        rollbackLocalState(messageId);
        AppLogger.debug("🔄 Rollback completed for:", messageId);
      } catch (error) {
        AppLogger.error("❌ Failed to rollback optimistic update:", error);
      }
      return false;
    }
  }

  /**
   * Check if a message was recently marked (within last 2 seconds).
   * Used to prevent duplicate marks.
   *
   * @param messageId - ID of message to check
   * @returns true if recently marked, false otherwise
   */
  wasRecentlyMarked(messageId: string): boolean {
    return this.recentlyMarkedMessages.has(messageId);
  }

  /**
   * Check if a marking operation is currently in progress.
   *
   * @param messageId - ID of message to check
   * @returns true if mark in progress, false otherwise
   */
  isMarkingInProgress(messageId: string): boolean {
    return this.markingInProgress.has(messageId);
  }

  /**
   * Get stats for debugging/monitoring.
   */
  getStats() {
    return {
      recentlyMarkedCount: this.recentlyMarkedMessages.size,
      inProgressCount: this.markingInProgress.size,
    };
  }
}

// Export singleton instance
export const messageReadService = new MessageReadService();
