const webpack = require('webpack');

module.exports = function override(config) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "process": require.resolve("process/browser.js"),
    "buffer": require.resolve("buffer/"),
    "util": require.resolve("util/"),
    "assert": require.resolve("assert/"),
    "http": require.resolve("stream-http"),
    "https": require.resolve("https-browserify"),
    "os": require.resolve("os-browserify/browser"),
    "url": require.resolve("url/"),
    "path": require.resolve("path-browserify"),
    "vm": require.resolve("vm-browserify"),
  };
  
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      process: 'process/browser.js',
      Buffer: ['buffer', 'Buffer'],
    }),
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
        REACT_APP_OKTO_ENVIRONMENT: JSON.stringify(process.env.REACT_APP_OKTO_ENVIRONMENT),
        REACT_APP_OKTO_CLIENT_PRIVATE_KEY: JSON.stringify(process.env.REACT_APP_OKTO_CLIENT_PRIVATE_KEY),
        REACT_APP_OKTO_CLIENT_SWA: JSON.stringify(process.env.REACT_APP_OKTO_CLIENT_SWA),
        REACT_APP_GOOGLE_CLIENT_ID: JSON.stringify(process.env.REACT_APP_GOOGLE_CLIENT_ID),
      }
    })
  ];
  
  config.resolve.extensions = [...config.resolve.extensions, ".ts", ".js"];
  config.ignoreWarnings = [/Failed to parse source map/];
  
  return config;
}; 