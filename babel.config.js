module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'babel-plugin-transform-typescript-metadata',
      ['@babel/plugin-proposal-decorators', { legacy: true }],
      // Debe ir SIEMPRE de ultimo (requisito de react-native-worklets /
      // react-native-reanimated v4, base de @gorhom/bottom-sheet).
      'react-native-worklets/plugin',
    ],
  };
};
