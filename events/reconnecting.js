var logging = require('..//util//logging');

module.exports = client => {
	logging.botLogger.log({
  	level: 'Info',
  	message: '(reconnecting.js:client) Client reconnecting!'
	});
}
