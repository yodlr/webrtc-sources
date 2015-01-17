// not supported :-/
module.exports = function () {
  var error = new Error('NotSupportedError');
  error.name = 'NotSupportedError';
  throw error;
};