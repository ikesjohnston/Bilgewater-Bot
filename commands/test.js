// Automated testing, neat!
var config = require('../config.json');
var logging = require('../util/logging');

exports.run = function(client, message, args) {
  if(message.author.id !== config.ownerID)
  {
    message.channel.send("\`\`\`You do not have permission to do that.\`\`\`");
    return;
  }

  message.channel.send("\`\`\`Running tests...\`\`\`");
  try {
		let cmdFile = require(`./search`);
		cmdFile.run(client, message, ['goblins']);
	} catch (err) {
		var owner = client.users.get(config.ownerID);
		logging.botLogger.log({
			level: 'Error',
			message: `Command \'${command}\' failed:\n${err}`
		});
    message.channel.send(`\`\`\`Test failed: ${config.prefix}${command}: ${err}\`\`\``);
    return;
	}
  message.channel.send("\`\`\`Tests complete!\`\`\`");
};
