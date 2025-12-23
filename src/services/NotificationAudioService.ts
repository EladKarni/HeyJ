import { Platform } from "react-native";
import {
  NotificationClickEvent,
  NotificationWillDisplayEvent,
  OneSignal,
} from "react-native-onesignal";
import { updateLastRead } from "../utilities/UpdateConversation";
import { useCoreAudioPlaybackStore } from "../stores/audio/useCoreAudioPlaybackStore";

interface NotificationData {
  conversationId?: string;
  messageUrl?: string;
}

export class NotificationAudioService {
  static initializeNotificationHandlers(
    setSelectedConversation: (id: string) => void,
    profileId: string
  ): () => void {
    // Skip notification handlers on web platform
    if (Platform.OS === 'web') {
      return () => {}; // Return empty cleanup function
    }

    const audioPlayer = useCoreAudioPlaybackStore.getState().audioPlayer;

    const onForeground = (event: NotificationWillDisplayEvent) => {
      const data = event.notification.additionalData as NotificationData;

      if (data && data.conversationId && data.messageUrl) {
        setSelectedConversation(data.conversationId);
        useCoreAudioPlaybackStore.getState().playFromUri(
          data.messageUrl, 
          data.conversationId, 
          audioPlayer || undefined
        );
        updateLastRead(data.conversationId, profileId);
      }
    };

    const onClick = (event: NotificationClickEvent) => {
      const data = event.notification.additionalData as NotificationData;

      if (data && data.conversationId && data.messageUrl) {
        setSelectedConversation(data.conversationId);
        useCoreAudioPlaybackStore.getState().playFromUri(
          data.messageUrl, 
          data.conversationId, 
          audioPlayer || undefined
        );
        updateLastRead(data.conversationId, profileId);
      }
    };

    OneSignal.Notifications.addEventListener("foregroundWillDisplay", onForeground);
    OneSignal.Notifications.addEventListener("click", onClick);

    // Return cleanup function
    return () => {
      OneSignal.Notifications.removeEventListener(
        "foregroundWillDisplay",
        onForeground
      );
      OneSignal.Notifications.removeEventListener("click", onClick);
    };
  }
}