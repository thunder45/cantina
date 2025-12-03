/** @type {import('jest').Config} */
module.exports = {
  ...require('../../jest.config.base'),
  rootDir: '.',
  displayName: 'frontend-mobile',
  moduleNameMapper: {
    '^@cantina-pos/shared$': '<rootDir>/../shared/src',
  },
};
