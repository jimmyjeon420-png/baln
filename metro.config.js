const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable Node.js externals to avoid Windows path issues
if (config.transformer) {
  config.transformer.disableModuleValidation = true;
}

module.exports = config;
