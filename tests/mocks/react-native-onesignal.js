// Mock for react-native-onesignal in development
// This prevents the "Could not load RNOneSignal" error

export const LogLevel = {
  None: 0,
  Fatal: 1,
  Error: 2,
  Warn: 3,
  Info: 4,
  Debug: 5,
  Verbose: 6,
};

// Helper to check if we're in mock mode
const isMockMode = () => {
  return !global.RNOneSignal; // Native module not loaded
};

export const OneSignal = {
  initialize: (appId) => {
    if (isMockMode()) {
      console.log("📱 OneSignal mock - initialize called with:", appId);
    }
  },
  login: (externalId) => {
    if (isMockMode()) {
      console.log("📱 OneSignal mock - login called with external ID:", externalId);
    }
  },
  logout: () => {
    if (isMockMode()) {
      console.log("📱 OneSignal mock - logout called");
    }
  },
  Debug: {
    setLogLevel: (level) => {
      if (isMockMode()) {
        console.log("📱 OneSignal mock - setLogLevel called:", level);
      }
    },
  },
  User: {
    pushSubscription: {
      getIdAsync: async () => {
        if (isMockMode()) {
          console.log("📱 OneSignal mock - getIdAsync called");
          // Return a mock subscription ID
          return 'mock-subscription-id-12345';
        }
        return null;
      },
      addEventListener: (event, callback) => {
        if (isMockMode()) {
          console.log("📱 OneSignal mock - addEventListener called:", event);
          // Simulate subscription change after 1 second
          setTimeout(() => {
            callback({
              current: { id: 'mock-subscription-id-12345' },
              previous: { id: null },
            });
          }, 1000);
        }
      },
    },
  },
  Notifications: {
    hasPermission: () => {
      if (isMockMode()) {
        console.log("📱 OneSignal mock - hasPermission called");
      }
      return true;
    },
    requestPermission: async (fallbackToSettings) => {
      if (isMockMode()) {
        console.log("📱 OneSignal mock - requestPermission called:", fallbackToSettings);
      }
      return Promise.resolve(true);
    },
    addEventListener: (event, callback) => {
      if (isMockMode()) {
        console.log("📱 OneSignal mock - Notifications.addEventListener called:", event);
      }
    },
    removeEventListener: (event, callback) => {
      if (isMockMode()) {
        console.log("📱 OneSignal mock - Notifications.removeEventListener called:", event);
      }
    },
  },
};

export default OneSignal;
