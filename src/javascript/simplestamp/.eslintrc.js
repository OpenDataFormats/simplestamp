module.exports = {
  extends: 'airbnb',
  rules: {
    'default-case': 0,
    'func-names': 0,
    'import/no-extraneous-dependencies': [
      'error',
      { devDependencies: true },
    ],
    'import/no-unresolved': 0,
    'lines-around-directive': 0,
    'no-multiple-empty-lines': 0,
    'no-underscore-dangle': 0,
    'sort-keys': 2,
  },
};
