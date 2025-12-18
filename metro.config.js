const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Add module resolution for mocking native modules in development (QR generator only)
config.resolver.extraNodeModules = {
  'rn-qr-generator': path.join(__dirname, 'tests/mocks/rn-qr-generator.js'),
};

module.exports = config;
