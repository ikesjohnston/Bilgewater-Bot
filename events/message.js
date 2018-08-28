const config = require('../config.json');
var logging = require('..//util//logging');

/**
 * Routes the chat message input by the user for processing
 * @param {Message} message The message sent in chat from the user
 */
module.exports = message => {
	// Don't process messages that don't begin with the configured prefix
	if (!message.content.startsWith(config.prefix)) return;
	// Don't process messages from the bot itself, to avoid infinite loops
	if (message.author.bot) return;

	const client = message.client;
	const args = message.content.split(' ');
	const command = args.shift().slice(config.prefix.length).toLowerCase();

	try {
		let cmdFile = require(`../commands/${command}`);
		cmdFile.run(client, message, args);
	} catch (err) {
		const owner = client.users.get(config.ownerID);
		message.reply(`command \'${command}\' failed or isn't a valid command... If you think this is a valid command, complain to ${owner}.`)
		logging.botLogger.log({
			level: 'Error',
			message: `Command \'${command}\' failed:\n${err.stack}`
		});
	}
};
