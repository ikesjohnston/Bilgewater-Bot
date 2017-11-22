const config = require('../config.json');
const chalk = require('chalk');

module.exports = client => {
	console.log(chalk.bgGreen.black('Client is ready!'));
	client.user.setGame(config.game);
}
