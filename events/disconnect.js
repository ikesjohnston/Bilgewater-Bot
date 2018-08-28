var logging = require('..//util//logging');

/**
 * Logs a message for client disconnects
 * @param {Client} client The Discord client 
 */
module.exports = client => {
	botLogger.log({
  	level: 'Warning',
  	message: '(disconnect.js:client) Client disconnected!'
	});
}
