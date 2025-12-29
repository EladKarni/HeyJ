import { supabase } from "../../utilities/Supabase";
import { UserLookupService } from "./UserLookupService";
import { FriendshipValidationService } from "./FriendshipValidationService";
import { FriendshipNotificationService } from "./FriendshipNotificationService";
import { FriendRequestService } from "./FriendRequestService";
import Profile from "../../objects/Profile";
import AppLogger from "../../utilities/AppLogger";


export class FriendshipService {
  static async sendFriendRequest(
    userCode: string,
    senderProfile: Profile
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Validate and lookup user
      const userValidation = await UserLookupService.validateUserForFriendship(
        userCode,
        senderProfile.uid
      );

      if (!userValidation.success || !userValidation.user) {
        return {
          success: false,
          error: userValidation.error || "User not found",
        };
      }

      const targetUser = userValidation.user;

      // Validate can send request
      const canSendResult =
        await FriendshipValidationService.validateCanSendRequest(
          senderProfile.uid,
          targetUser
        );

      if (!canSendResult.success) {
        return { success: false, error: canSendResult.error };
      }

      // Check if we need to update a rejected request or create a new one
      const existing =
        await FriendshipValidationService.checkExistingFriendship(
          senderProfile.uid,
          targetUser.uid
        );

      if (existing && existing.status === "rejected") {
        // Update rejected request to pending
        const { error: updateError } = await supabase
          .from("friendships")
          .update({
            status: "pending",
            requester_id: senderProfile.uid,
            addressee_id: targetUser.uid,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (updateError) {
          return { success: false, error: "Failed to send friend request" };
        }

        // Send notification
        await FriendshipNotificationService.sendFriendRequestNotification(
          targetUser.uid,
          senderProfile
        );

        return { success: true };
      }

      // Create new friend request
      const { error: insertError } = await supabase.from("friendships").insert({
        requester_id: senderProfile.uid,
        addressee_id: targetUser.uid,
        status: "pending",
      });

      if (insertError) {
        if (insertError.code === "23505") {
          return {
            success: false,
            error: "Friend request already exists",
          };
        }
        return { success: false, error: "Failed to send friend request" };
      }

      // Send notification
      await FriendshipNotificationService.sendFriendRequestNotification(
        targetUser.uid,
        senderProfile
      );

      return { success: true };
    } catch (error: any) {
      console.error("Error sending friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to send friend request",
      };
    }
  }

  static async blockUser(
    requestId: string,
    blockerUserId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the request to find the other user
      const { data: request, error: fetchError } = await supabase
        .from("friendships")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError || !request) {
        return { success: false, error: "Friend request not found" };
      }

      const otherUserId =
        request.requester_id === blockerUserId
          ? request.addressee_id
          : request.requester_id;

      // Update or create blocked status
      const { error: updateError } = await supabase.from("friendships").upsert(
        {
          requester_id: otherUserId,
          addressee_id: blockerUserId,
          status: "blocked",
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "requester_id,addressee_id",
        }
      );

      if (updateError) {
        return { success: false, error: "Failed to block user" };
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error blocking user:", error);
      return {
        success: false,
        error: error.message || "Failed to block user",
      };
    }
  }

  static async acceptFriendRequest(
    requestId: string,
    accepterProfile: Profile
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Accept the request
      const result = await FriendRequestService.acceptRequest(
        requestId,
        accepterProfile.uid
      );

      if (!result.success) {
        return result;
      }

      // Get the requester's info and send notification
      const { data: friendRequest } = await supabase
        .from("friendships")
        .select("requester_id")
        .eq("id", requestId)
        .single();

      if (friendRequest?.requester_id) {
        await FriendshipNotificationService.sendFriendAcceptedNotification(
          friendRequest.requester_id,
          accepterProfile
        );
        
        // Create conversation between the new friends
        const { findOrCreateConversation } = await import("../../utilities/FindOrCreateConversation");
        const conversationResult = await findOrCreateConversation(
          friendRequest.requester_id,
          accepterProfile.uid
        );
        
        if (conversationResult.isNew) {
          AppLogger.debug("🎉 Created new conversation for new friends", {
            conversationId: conversationResult.conversation.conversationId,
            requesterId: friendRequest.requester_id,
            accepterId: accepterProfile.uid
          });
        }
      }

      return { success: true };
    } catch (error: any) {
      console.error("Error accepting friend request:", error);
      return {
        success: false,
        error: error.message || "Failed to accept friend request",
      };
    }
  }
}
