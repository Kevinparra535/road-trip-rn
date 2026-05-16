const expoConfig = require('eslint-config-expo/flat');
const eslintConfigPrettier = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  eslintConfigPrettier,
  {
    ignores: [
      'node_modules/',
      '.expo/',
      'android/',
      'ios/',
      'coverage/',
      'dist/',
    ],
  },
];
