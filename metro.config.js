const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add module resolution for mocking native modules in development
config.resolver.extraNodeModules = {
  'react-native-onesignal': __dirname + '/mocks/react-native-onesignal.js',
  'rn-qr-generator': __dirname + '/mocks/rn-qr-generator.js',
};

module.exports = config;
