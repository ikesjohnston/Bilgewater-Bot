var config = require('../config.json');
var schedule = require('node-schedule');
var logging = require('..//util//logging');
var price  = require('../commands/price');

module.exports = client => {
	logging.botLogger.log({
  	level: 'Info',
  	message: '(ready.js:client) Client is ready!'
	});

	client.user.setActivity(`${config.prefix}${config.game}`);

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
