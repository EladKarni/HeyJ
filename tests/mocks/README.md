# Mock Modules for Development

This directory contains mock implementations of native modules that aren't available in Expo Go.

## Why Mocks?

Some React Native libraries require native code that can't run in Expo Go:
- `rn-qr-generator` - QR code scanning

Instead of showing errors, we provide mock implementations that:
- Prevent startup errors
- Allow the app to run in Expo Go
- Log helpful messages
- Gracefully disable features

## How It Works

The `metro.config.js` file tells Metro bundler to use these mocks instead of the real modules:

```javascript
config.resolver.extraNodeModules = {
  'rn-qr-generator': __dirname + '/mocks/rn-qr-generator.js',
};
```

## Mocked Modules

### rn-qr-generator.js
Mocks QR code scanning:
- `RNQRGenerator.detect()` - Returns rejection with helpful message

**Result:** QR scanning shows error message when attempted.

## Production Builds

These mocks are **only used in development** with Expo Go.

In production builds (EAS Build or native builds):
- Real native modules are used
- All features work normally
- Push notifications enabled
- QR scanning enabled

## Testing Native Features

To test features that require native code:

### Option 1: EAS Build (Recommended)
```bash
eas build --profile development --platform ios
eas build --profile development --platform android
```

### Option 2: Local Build
```bash
# iOS
npx expo run:ios

# Android
npx expo run:android
```

## Updating Mocks

If you need to add more native modules:

1. Create a mock file in this directory
2. Add it to `metro.config.js`
3. Restart Metro bundler

Example:
```javascript
// mocks/my-native-module.js
export default {
  someMethod: () => {
    console.log("Mock: someMethod called");
    return Promise.resolve(null);
  },
};
```

```javascript
// metro.config.js
config.resolver.extraNodeModules = {
  'my-native-module': __dirname + '/mocks/my-native-module.js',
};
```
