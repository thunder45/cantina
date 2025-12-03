/** @type {import('jest').Config} */
module.exports = {
  ...require('../../jest.config.base'),
  rootDir: '.',
  displayName: 'backend',
  moduleNameMapper: {
    '^@cantina-pos/shared$': '<rootDir>/../shared/src',
  },
};
