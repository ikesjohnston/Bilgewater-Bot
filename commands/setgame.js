var config = require('../config.json');

exports.run = function(client, message, args) {
  if(message.author.id !== config.ownerID)
  {
    message.channel.send("\`\`\`You do not have permission to do that.\`\`\`");
    return;
  }

  var newgame = message.content.replace(`${config.prefix}setgame `, "");
  client.user.setActivity(newgame);
};
