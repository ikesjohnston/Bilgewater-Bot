/**
 * Loads all client level event processors
 * @param {Event} event - The event processor being loaded
 */
const reqEvent = (event) => require(`../events/${event}`)

module.exports = client => {
	client.on('ready', () => reqEvent('ready')(client));
	client.on('reconnecting', () => reqEvent('reconnecting')(client));
	client.on('disconnect', () => reqEvent('disconnect')(client));
	client.on('message', reqEvent('message'));
	client.on('warn', reqEvent('warning'));
	client.on('error', reqEvent('error'));
};
