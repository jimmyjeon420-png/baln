const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Disable Node.js externals to avoid Windows path issues
if (config.transformer) {
  config.transformer.disableModuleValidation = true;

  // Production optimizations
  config.transformer.minifierConfig = {
    compress: {
      // Remove console.log in production
      drop_console: true,
      // Remove debugger statements
      drop_debugger: true,
      // More aggressive compression
      pure_funcs: ['console.log', 'console.debug', 'console.info'],
    },
    mangle: {
      // Mangle variable names for smaller bundle
      toplevel: false,
    },
    output: {
      // Beautify output for easier debugging (set to false for production)
      beautify: false,
      // Remove comments
      comments: false,
    },
  };
}

// Serializer optimizations for bundle size
config.serializer = {
  ...config.serializer,

  // Custom module filter to exclude unnecessary files
  processModuleFilter: (module) => {
    // Exclude test files from production bundle
    if (module.path.includes('__tests__') ||
        module.path.includes('__mocks__') ||
        module.path.includes('.test.') ||
        module.path.includes('.spec.')) {
      return false;
    }
    return true;
  },
};

module.exports = config;
