import { sendPushNotification } from "../../utilities/PushNotifications";
import Profile from "../../objects/Profile";
import AppLogger from "@/utilities/AppLogger";

export class FriendshipNotificationService {
  static async sendFriendRequestNotification(
    recipientId: string,
    senderProfile: Profile
  ): Promise<void> {
    try {
      await sendPushNotification(
        recipientId,
        senderProfile.name,
        senderProfile.profilePicture,
        "", // No conversation ID for friend requests
        "", // No message URL
        "friend_request"
      );
    } catch (error) {
      AppLogger.warn("⚠️ Failed to send friend request notification:", error);
    }
  }

  static async sendFriendAcceptedNotification(
    recipientId: string,
    accepterProfile: Profile
  ): Promise<void> {
    try {
      await sendPushNotification(
        recipientId,
        accepterProfile.name,
        accepterProfile.profilePicture,
        "",
        "",
        "friend_accepted"
      );
    } catch (error) {
      AppLogger.warn("⚠️ Failed to send friend accepted notification:", error);
    }
  }
}
