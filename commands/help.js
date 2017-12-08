const config = require('../config.json');

exports.run = function(client, message, args) {
  var helpMessage = `Valid commands: \n\n${config.prefix}toon      - Get general information on a character \n\n${config.prefix}affix     - Get the current Mythic+ affixes` +
  ` or schedule\n\n${config.prefix}logs      - Get raid or encounter logs for a character\n\n${config.prefix}bookmarks - bookmark up to 10 characters for use with other commands`;
  var helpMessageFormatted = '```' + helpMessage + '```';
  message.channel.send(helpMessageFormatted);
};
