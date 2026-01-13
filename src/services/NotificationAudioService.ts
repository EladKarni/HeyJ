import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { updateLastRead } from "../utilities/UpdateConversation";
import { useCoreAudioPlaybackStore } from "../stores/audio/useCoreAudioPlaybackStore";

interface NotificationData {
  conversationId?: string;
  messageUrl?: string;
  messageId?: string;
}

export class NotificationAudioService {
  static initializeNotificationHandlers(
    setSelectedConversation: (id: string) => void,
    profileId: string,
    navigateToConversation?: (conversationId: string) => void,
    updateMessageReadStatus?: (messageId: string) => void
  ): () => void {
    // Skip notification handlers on web platform
    if (Platform.OS === 'web') {
      return () => {}; // Return empty cleanup function
    }

    const audioPlayer = useCoreAudioPlaybackStore.getState().audioPlayer;

    // Handle notifications received while app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const data = notification.request.content.data as NotificationData;

        if (data && data.conversationId && data.messageUrl) {
          setSelectedConversation(data.conversationId);
          useCoreAudioPlaybackStore.getState().playFromUri(
            data.messageUrl,
            data.conversationId,
            audioPlayer || undefined,
            data.messageId,
            updateMessageReadStatus
          );
          updateLastRead(data.conversationId, profileId);
        }
      }
    );

    // Handle notification tap/click
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data as NotificationData;

        if (data && data.conversationId && data.messageUrl) {
          setSelectedConversation(data.conversationId);

          // Navigate to the conversation screen when notification is clicked
          if (navigateToConversation) {
            navigateToConversation(data.conversationId);
          }

          useCoreAudioPlaybackStore.getState().playFromUri(
            data.messageUrl,
            data.conversationId,
            audioPlayer || undefined,
            data.messageId,
            updateMessageReadStatus
          );
          updateLastRead(data.conversationId, profileId);
        }
      }
    );

    // Return cleanup function
    return () => {
      foregroundSubscription.remove();
      responseSubscription.remove();
    };
  }
}
