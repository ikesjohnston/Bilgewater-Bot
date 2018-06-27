var config = require('../config.json');

exports.run = function(client, message, args) {
  if(message.author.id !== config.ownerID)
  {
    message.reply('sorry, you don\'t have permission to do that.');
    return;
  }

  var newgame = message.content.replace(`${config.prefix}setgame `, "");
  client.user.setActivity(newgame);
};
