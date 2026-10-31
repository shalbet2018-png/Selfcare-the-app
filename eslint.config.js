// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', 'desktop/node_modules/*', 'desktop/web/*', 'desktop/release/*', 'pages/*', 'android/*', 'ios/*'],
  },
]);
