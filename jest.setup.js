// Set up test environment
global.__DEV__ = true;

// Polyfill structuredClone if not available
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock Expo Metro Registry
if (!global.__ExpoImportMetaRegistry) {
  global.__ExpoImportMetaRegistry = {
    register: () => {},
    get: () => ({}),
    has: () => false,
    clear: () => {},
    size: 0
  };
}

// Mock Supabase
jest.mock('./utilities/Supabase', () => ({
  supabase: {
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn()
    },
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
        getPublicUrl: jest.fn()
      }))
    },
    from: jest.fn(() => ({
      insert: jest.fn(),
      select: jest.fn(),
      update: jest.fn()
    }))
  }
}));

// Mock AuthHelper
jest.mock('./utilities/AuthHelper', () => ({
  signUpWithEmail: jest.fn(),
  signInWithEmail: jest.fn(),
  signOut: jest.fn()
}));

// Mock expo-image-picker
jest.mock('expo-image-picker', () => ({
  requestMediaLibraryPermissionsAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: {
    Images: 'Images'
  }
}));

// Mock expo-linking
jest.mock('expo-linking', () => ({
  openSettings: jest.fn()
}));

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  AntDesign: 'AntDesign',
  FontAwesome: 'FontAwesome',
  MaterialIcons: 'MaterialIcons',
  Feather: 'Feather'
}));

// Mock React Native Image
jest.mock('react-native/Libraries/Image/Image', () => 'Image');

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn()
  })
}));

// Mock Alert
global.Alert = {
  alert: jest.fn()
};

// Mock fetch for file uploads
global.fetch = jest.fn();
