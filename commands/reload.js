var config = require('../config.json');
var logging = require('../util/logging');

exports.run = (client, message, args) => {
  if(message.author.id !== config.ownerID)
  {
    logging.botLogger.log({
      level: 'Warning',
      message: `(reload.js:run) ${message.author.username} requested to reload a command, but is not the bot owner. ` +
      `Denying request.`
    });
    message.channel.send("\`\`\`You do not have permission to do that.\`\`\`");
    return;
  }
  if(!args || args.size < 1) return message.channel.send("\`\`\`Must provide a command name to reload.\`\`\`");
  // the path is relative to the *current folder*, so just ./filename.js
  delete require.cache[require.resolve(`./${args[0]}.js`)];
  message.reply(`the \'${args[0]}\' command has been reloaded!`);

  logging.botLogger.log({
    level: 'Info',
    message: `(reload.js:run) the \'${args[0]}\` command was reloaded!`
  });
};
