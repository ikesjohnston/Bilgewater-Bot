var config = require('../config.json');
const winston = require('winston');
const chalk = require('chalk');

exports.run = function(client, message, args) {
  if(message.author.id !== config.ownerID)
  {
    console.log(`${message.author.id} tried to set the Bot's game.`)
    message.channel.send("\`\`\`You do not have permission to do that.\`\`\`");
    return;
  }

  var newgame = message.content.replace(`${config.prefix}setgame `, "");
  client.user.setGame(newgame);
};
