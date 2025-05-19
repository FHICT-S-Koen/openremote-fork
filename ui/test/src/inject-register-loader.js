module.exports = function (source) {
  console.log(source.registerSource);
  const options = this.getOptions();
  return options.registerSource + "\n" + source;
};
