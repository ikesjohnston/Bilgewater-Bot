var config = require('../config.json');
var schedule = require('node-schedule');
var logging = require('..//util//logging');
var price  = require('../commands/price');

/**
 * Logs a message when the client ies ready and initializes
 * any required jobs
 * @param {Client} client The Discord client 
 */
module.exports = client => {
	logging.botLogger.log({
  	level: 'Info',
  	message: '(ready.js:client) Client is ready!'
	});

	// Sets the bot's activity in the discord client; used to show
	// bot help command
	client.user.setActivity(`${config.prefix}${config.game}`);

	// Auction API related functionality; disabled for now due
	// to API changes 
	var jobList = schedule.scheduledJobs;
	
	for(jobName in jobList){
	  var job = 'jobList.' + jobName;
	  eval(job+'.cancel()');
	}
	
	// Update Item DB every day at 5am
	var j = schedule.scheduleJob('* 5 * * *', function(){
	 	price.updateItemDB();
	});
};
