var logging = require('..//util//logging');

/**
 * Logs a message for client reconnects
 * @param {Client} client The Discord client 
 */
module.exports = client => {
	logging.botLogger.log({
  	level: 'Info',
  	message: '(reconnecting.js:client) Client reconnecting!'
	});
}
