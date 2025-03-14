/*
 * Eslint config file
 * Documentation: https://eslint.org/docs/user-guide/configuring/
 * Install the Eslint extension before using this feature.
 */
module.exports = {
  env: {
    es6: true,
    browser: true,
    node: true,
  },
  ecmaFeatures: {
    modules: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  globals: {
    wx: true,
    App: true,
    Page: true,
    getCurrentPages: true,
    getApp: true,
    Component: true,
    requirePlugin: true,
    requireMiniProgram: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
    'plugin:miniprogram/recommended'
  ],
  plugins: [
    'miniprogram'
  ],
  rules: {
    // 微信小程序特定规则
    'camelcase': 'off',
    'no-unused-vars': ['error', { 'varsIgnorePattern': 'Page|App|Component|getApp|getCurrentPages' }],
    // 常用规则
    'indent': ['error', 2, { 'SwitchCase': 1 }],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'always-multiline'],
    'no-console': ['warn', { 'allow': ['warn', 'error'] }],
    // 与 Prettier 集成的规则
    'prettier/prettier': ['error', {}, { 'usePrettierrc': true }]
  },
}
