module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          root: ['./src'],
          alias: {
            '@': './src',
            '@components': './src/components',
            '@screens': './src/screens',
            '@utilities': './src/utilities',
            '@hooks': './src/hooks',
            '@stores': './src/stores',
            '@objects': './src/objects',
            '@services': './src/services',
            '@styles': './src/styles',
            '@app-types': './src/types',
            '@assets': './assets',
            '@tests': './tests',
          },
          extensions: ['.js', '.jsx', '.ts', '.tsx', '.json']
        }
      ]
    ]
  };
};
