module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ВАЖНО: react-native-reanimated/plugin должен быть последним среди плагинов
      [
        'module-resolver',
        {
          root: ['.'],
          alias: { '@': '.' },
          extensions: ['.ios.js', '.android.js', '.js', '.ts', '.tsx', '.json'],
        },
      ],
      'react-native-reanimated/plugin',
    ],
  };
};
