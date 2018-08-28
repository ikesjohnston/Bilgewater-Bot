var bot = require('..//bot.js');
var logging = require('..//util//logging');

/**
 * Logs an warning message
 * @param {String} warning The message from the thrown warning 
 */
module.exports = warning => {
	logging.botLogger.log({
  	level: 'Warning',
  	message: `(warning.js) ${warning.replace(bot.regToken, '*****')}`
	});
}