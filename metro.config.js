// Necesario para que Firebase (firebase/ai) resuelva bien en Expo SDK 50
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
