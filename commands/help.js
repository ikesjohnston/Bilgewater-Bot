const config = require('../config.json');

exports.run = function(client, message, args) {
  var helpMessage = `Valid commands: \n\n${config.prefix}toon - Get information on a character \n\n${config.prefix}mp   - Get the current Mythic+ affixes\n\n${config.prefix}logs - Get raid or encounter logs for a character`;
  var helpMessageFormatted = '```' + helpMessage + '```';
  message.channel.send(helpMessageFormatted);
};
