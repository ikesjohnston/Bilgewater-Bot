const config = require('../config.json');

exports.run = function(client, message, args) {
  var helpMessage = `Valid commands: \n\n${config.prefix}toon  - Get general information on a character \n\n${config.prefix}affix - Get the current Mythic+ affixes or schedule\n\n${config.prefix}logs  - Get raid or encounter logs for a character`;
  var helpMessageFormatted = '```' + helpMessage + '```';
  message.channel.send(helpMessageFormatted);
};
