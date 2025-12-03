/** @type {import('jest').Config} */
module.exports = {
  ...require('../../jest.config.base'),
  rootDir: '.',
  displayName: 'frontend-web',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '^@cantina-pos/shared$': '<rootDir>/../shared/src',
  },
};
