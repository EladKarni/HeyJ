// Mock for react-native-onesignal in development
// This prevents the "Could not load RNOneSignal" error

export const OneSignal = {
  initialize: () => {
    console.log("📱 OneSignal mock - push notifications disabled in development");
  },
  User: {
    pushSubscription: {
      getPushSubscriptionId: () => null,
      addEventListener: () => {},
    },
  },
  Notifications: {
    hasPermission: () => false,
    requestPermission: () => Promise.resolve({ status: 'denied' }),
    addEventListener: () => {},
    removeEventListener: () => {},
  },
};

export default OneSignal;
