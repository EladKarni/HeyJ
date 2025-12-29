import { supabase } from "../../utilities/Supabase";
import { UserLookupResult } from "./UserLookupService";
import AppLogger from "@/utilities/AppLogger";

export class FriendshipValidationService {
  static async checkForBlocks(
    userId: string,
    otherUserId: string
  ): Promise<{ theyBlockedUs: boolean; weBlockedThem: boolean }> {
    try {
      const { data: existingBlocks } = await supabase
        .from("friendships")
        .select("*")
        .eq("status", "blocked")
        .or(
          `and(requester_id.eq.${otherUserId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${otherUserId})`
        );

      if (!existingBlocks || existingBlocks.length === 0) {
        return { theyBlockedUs: false, weBlockedThem: false };
      }

      const theyBlockedUs = existingBlocks.some(
        (block) =>
          block.requester_id === otherUserId && block.addressee_id === userId
      );

      const weBlockedThem = existingBlocks.some(
        (block) =>
          block.requester_id === userId && block.addressee_id === otherUserId
      );

      return { theyBlockedUs, weBlockedThem };
    } catch (error) {
      AppLogger.error("Error checking for blocks:", error);
      return { theyBlockedUs: false, weBlockedThem: false };
    }
  }

  static async checkExistingFriendship(
    userId: string,
    otherUserId: string
  ): Promise<{ status: string; id?: string } | null> {
    try {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(
          `and(requester_id.eq.${userId},addressee_id.eq.${otherUserId}),and(requester_id.eq.${otherUserId},addressee_id.eq.${userId})`
        )
        .limit(1);

      if (error || !data || data.length === 0) {
        return null;
      }

      return { status: data[0].status, id: data[0].id };
    } catch (error) {
      AppLogger.error("Error checking existing friendship:", error);
      return null;
    }
  }

  static async validateCanSendRequest(
    userId: string,
    targetUser: UserLookupResult
  ): Promise<{ success: boolean; error?: string }> {
    // Check for blocks
    const { theyBlockedUs } = await this.checkForBlocks(userId, targetUser.uid);
    if (theyBlockedUs) {
      return {
        success: false,
        error: "You cannot send a friend request to this user",
      };
    }

    // Check existing relationships
    const existing = await this.checkExistingFriendship(userId, targetUser.uid);
    if (!existing) {
      return { success: true }; // No existing relationship, can proceed
    }

    // Handle different existing statuses
    switch (existing.status) {
      case "accepted":
        return { success: false, error: "You are already friends" };
      case "pending":
        return {
          success: false,
          error: "Friend request already sent or received",
        };
      case "rejected":
        return { success: true }; // Can re-send after rejection
      default:
        return { success: false, error: "Cannot send friend request" };
    }
  }
}
