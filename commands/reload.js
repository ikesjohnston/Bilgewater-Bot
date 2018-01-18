var config = require('../config.json');
const winston = require('winston');
const chalk = require('chalk');

exports.run = (client, message, args) => {
  if(message.author.id !== config.ownerID)
  {
    console.log(`${message.author.username} tried to reload a command.`)
    message.channel.send("\`\`\`You do not have permission to do that.\`\`\`");
    return;
  }
  if(!args || args.size < 1) return message.channel.send("\`\`\`Must provide a command name to reload.\`\`\`");
  // the path is relative to the *current folder*, so just ./filename.js
  delete require.cache[require.resolve(`./${args[0]}.js`)];
  message.reply(`the ${args[0]} command has been reloaded!`);
};
