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

export interface PushSubscriptionChangedState {
  current: {
    id: string | null;
    token: string | null;
    optedIn: boolean;
  };
  previous: {
    id: string | null;
    token: string | null;
    optedIn: boolean;
  };
}

export enum LogLevel {
  None = 0,
  Fatal = 1,
  Error = 2,
  Warn = 3,
  Info = 4,
  Debug = 5,
  Verbose = 6,
}

export const OneSignal: {
  initialize: (appId: string) => void;
  login: (externalId: string) => void;
  logout: () => void;
  Debug: {
    setLogLevel: (level: LogLevel) => void;
    setAlertLevel: (level: LogLevel) => void;
  };
  User: {
    pushSubscription: {
      getIdAsync: () => Promise<string | null>;
      getTokenAsync: () => Promise<string | null>;
      getOptedInAsync: () => Promise<boolean>;
      addEventListener: (event: 'change', handler: (event: PushSubscriptionChangedState) => void) => void;
      removeEventListener: (event: 'change', handler: (event: PushSubscriptionChangedState) => void) => void;
      optIn: () => void;
      optOut: () => void;
    };
  };
  Notifications: {
    hasPermission: () => boolean;
    getPermissionAsync: () => Promise<boolean>;
    requestPermission: (fallbackToSettings?: boolean) => Promise<boolean>;
    addEventListener: (event: string, handler: (event: any) => void) => void;
    removeEventListener: (event: string, handler: (event: any) => void) => void;
  };
};

export default OneSignal;
