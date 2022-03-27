module.exports = {
  extends: 'airbnb',
  rules: {
    'default-case': 0,
    'func-names': 0,
    'import/no-extraneous-dependencies': [
      'error',
      {
        devDependencies: true,
      },
    ],
    'import/no-unresolved': [
      2, {
        ignore: ['\\.css$'],
      },
    ],
    'lines-around-directive': 0,
    'no-underscore-dangle': 0,
    'sort-keys': 2,
  },
};
