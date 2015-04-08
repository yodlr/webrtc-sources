// not supported :-/
module.exports = function mod() {
  var error = new Error('NotSupportedError');
  error.name = 'NotSupportedError';
  throw error;
};
