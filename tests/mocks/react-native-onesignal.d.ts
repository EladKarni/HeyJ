// Type definitions for react-native-onesignal mock

export interface NotificationClickEvent {
  notification: {
    notificationId: string;
    additionalData?: any;
  };
}

export interface NotificationWillDisplayEvent {
  notification: {
    notificationId: string;
    additionalData?: any;
  };
  preventDefault: () => void;
}

export const OneSignal: {
  initialize: (appId: string) => void;
  User: {
    pushSubscription: {
      getPushSubscriptionId: () => string | null;
      addEventListener: (event: string, handler: (event: any) => void) => void;
    };
  };
  Notifications: {
    hasPermission: () => boolean;
    requestPermission: () => Promise<{ status: string }>;
    addEventListener: (event: string, handler: (event: any) => void) => void;
    removeEventListener: (event: string, handler: (event: any) => void) => void;
  };
};

export default OneSignal;
