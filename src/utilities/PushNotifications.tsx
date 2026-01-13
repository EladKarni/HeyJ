import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './Supabase';
import { handleError } from './errorHandler';
import AppLogger from "./AppLogger";

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Initialize push notifications and register for push notifications
 * Call this once when the user logs in
 */
export async function initializePushNotifications(userId: string): Promise<void> {
  try {
    // Skip on web - push notifications only work on mobile
    if (Platform.OS === 'web') {
      AppLogger.debug('Web platform detected - skipping push notification initialization');
      return;
    }

    AppLogger.debug('Initializing push notifications for user', { userId });

    // Register for push notifications
    await registerForPushNotificationsAsync(userId);

    AppLogger.debug('Push notifications initialized successfully');
  } catch (error) {
    handleError(error, 'initializePushNotifications');
  }
}

/**
 * Register device for push notifications and store Expo Push Token
 */
export async function registerForPushNotificationsAsync(userId: string): Promise<void> {
  try {
    // Push notifications only work on physical devices
    if (!Device.isDevice) {
      AppLogger.debug('Push notifications require a physical device');
      return;
    }

    // Check existing permission status
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      AppLogger.debug('Requesting push notification permission...');
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      AppLogger.debug('Push notification permission denied');
      return;
    }

    // Get the Expo Push Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      AppLogger.warn('EAS project ID not found - cannot get push token');
      return;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const pushToken = tokenData.data;

    AppLogger.debug('Expo Push Token', { pushToken });

    // Save token to push_tokens table
    const { error } = await supabase
      .from('push_tokens')
      .upsert({
        uid: userId,
        tokens: [pushToken],
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'uid'
      });

    if (error) {
      handleError(error, 'registerForPushNotificationsAsync');
    } else {
      AppLogger.debug('Push token saved to push_tokens');
    }

    // Set up Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#fa7a3c',
      });
    }
  } catch (error) {
    handleError(error, 'registerForPushNotificationsAsync');
  }
}

/**
 * Clear the app badge number (iOS only)
 */
export async function clearBadgeCount(): Promise<void> {
  try {
    // iOS only - Android doesn't have app icon badges
    if (Platform.OS !== 'ios') {
      AppLogger.debug('Badge clearing skipped - not iOS platform');
      return;
    }

    await Notifications.setBadgeCountAsync(0);
    AppLogger.debug('Badge count cleared');
  } catch (error) {
    handleError(error, 'clearBadgeCount');
  }
}

/**
 * Set the app badge number (iOS only)
 */
export async function setBadgeCount(count: number): Promise<void> {
  try {
    // iOS only - Android doesn't have app icon badges
    if (Platform.OS !== 'ios') {
      AppLogger.debug('Badge setting skipped - not iOS platform');
      return;
    }

    await Notifications.setBadgeCountAsync(count);
    AppLogger.debug('Badge count set', { count });
  } catch (error) {
    handleError(error, 'setBadgeCount');
  }
}

/**
 * Remove push token on logout
 */
export const removeToken = async (uid: string): Promise<void> => {
  try {
    // Remove token from push_tokens table
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('uid', uid);

    if (error) {
      handleError(error, 'removeToken');
    } else {
      AppLogger.debug('Push token removed from push_tokens');
    }
  } catch (error) {
    handleError(error, 'removeToken');
  }
};

/**
 * Send push notification via Expo Push API
 * Fetches recipient's push token from database
 */
export async function sendPushNotification(
  toUid: string,
  fromName: string,
  fromPhoto: string,
  conversationId: string,
  messageUrl: string,
  notificationType: 'message' | 'friend_request' | 'friend_accepted' = 'message'
): Promise<void> {
  try {
    // Fetch recipient's push token from database
    const { data: tokenData, error: tokenError } = await supabase
      .from('push_tokens')
      .select('tokens')
      .eq('uid', toUid)
      .single();

    if (tokenError || !tokenData?.tokens?.[0]) {
      AppLogger.debug('No push token found for user', { toUid });
      return;
    }

    const pushToken = tokenData.tokens[0];

    // Prepare notification content based on type
    const notificationContent = getNotificationContent(notificationType, fromName);

    AppLogger.debug('Sending push notification to user', { toUid });

    // Call Expo Push API
    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: pushToken,
        title: notificationContent.title,
        body: notificationContent.message,
        data: {
          conversationId,
          messageUrl,
          fromName,
          fromPhoto,
          notificationType,
        },
        sound: 'default',
        badge: 1,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      AppLogger.error('Expo Push API error', result);
      throw new Error(`Expo Push API error: ${JSON.stringify(result)}`);
    }

    AppLogger.debug('Push notification sent successfully');
  } catch (error) {
    // Don't block the main operation if notification fails
    AppLogger.warn('Failed to send push notification', error as Error);
    handleError(error, 'sendPushNotification', false);
  }
}

/**
 * Helper function to generate notification content based on type
 */
function getNotificationContent(
  type: string,
  fromName: string
): { title: string; message: string } {
  switch (type) {
    case 'message':
      return {
        title: fromName,
        message: 'Sent you a voice message',
      };
    case 'friend_request':
      return {
        title: fromName,
        message: 'Sent you a friend request',
      };
    case 'friend_accepted':
      return {
        title: fromName,
        message: 'Accepted your friend request',
      };
    default:
      return {
        title: fromName,
        message: 'You have a new notification',
      };
  }
}
