const config = require('../config.json');
var logging = require('..//util//logging');

module.exports = message => {
	if (!message.content.startsWith(config.prefix)) return;
  if (message.author.bot) return;

	const client = message.client;
	const args = message.content.split(' ');
	const command = args.shift().slice(config.prefix.length).toLowerCase();

	try {
		let cmdFile = require(`../commands/${command}`);
		cmdFile.run(client, message, args);
	} catch (err) {
		var owner = client.users.get(config.ownerID);
		message.reply(`command \'${command}\' failed or isn't a valid command... If you think this is a valid command, complain to ${owner}.`)
		logging.botLogger.log({
			level: 'Error',
			message: `Command \'${command}\' failed:\n${err.stack}`
		});
	}
};
