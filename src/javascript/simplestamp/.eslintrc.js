module.exports = {
  "extends": "airbnb",
  "rules": {
    "default-case": 0,
    "func-names": 0,
    "lines-around-directive": 0,
    "no-underscore-dangle": 0,
    "import/no-unresolved": {
      ignore: ['\.css$']
    },
    "import/no-extraneous-dependencies": [
      "error",
      {"devDependencies": true}
    ],
    "sort-keys": 2,
  }
};
