var bot = require('..//bot.js');
var logging = require('..//util//logging');

/**
 * Logs an error message
 * @param {String} error The message from the thrown error 
 */
module.exports = error => {
	logging.botLogger.log({
  	level: 'Error',
  	message: `(error.js) ${error.replace(bot.regToken, '*****')}`
	});
}