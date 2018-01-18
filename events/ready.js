const config = require('../config.json');
const chalk = require('chalk');
var schedule = require('node-schedule');
var price  = require('../commands/price');

module.exports = client => {
	console.log(chalk.bgGreen.black('Client is ready!'));
	client.user.setGame(config.game);

	// Update Item DB every day at 5am
	var j = schedule.scheduleJob('* 5 * * *', function(){
  	price.updateItemDB();
	});
};
