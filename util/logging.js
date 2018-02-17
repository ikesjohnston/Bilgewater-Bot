const winston = require('winston');
const moment = require('moment');
const common = require('./common');

// Set up logs directory if it doesn't exist
const fs = require( 'fs' );
const path = require('path');
const logsDir = 'logs';
if ( !fs.existsSync( logsDir ) ) {
    fs.mkdirSync( logsDir );
}

//Start logger setup
var { createLogger, format, transports } = require('winston');
var { combine, timestamp, label, printf, colorize } = format;

var tsFormat = () => moment().format('YYYY-MM-DD hh:mm:ss').trim();

var logFormat = printf(info => {
  return `${tsFormat()} [${info.label}] ${info.level}: ${info.message}`;
});

var customLevels = {
  levels: {
    Info: 0,
    Warning: 1,
    Error: 2
  },
  colors: {
    Info: 'green',
    Warning: 'yellow',
    Error: 'red'
  }
};

winston.addColors(customLevels);

exports.botLogger = makeLog('bot');
exports.usersLogger = makeLog('users');
exports.toonLogger = makeLog('toon');
exports.logsLogger = makeLog('logs');
exports.priceLogger = makeLog('price');
exports.searchLogger = makeLog('search');
// End logger setup

function makeLog(logname)
{
  logger = createLogger({
  	levels: customLevels.levels,
    transports: [
      new transports.Console({
  			level: 'Error',
  			format: combine(
  				colorize(),
  		    label({ label: common.capitalizeFirstLetter(logname) }),
          timestamp(),
  		    logFormat
  		  )
  		}),
      new transports.File({
  			filename: path.join(logsDir, `/${logname}.log`),
  			level: 'Error',
  			format: combine(
  		    label({ label: common.capitalizeFirstLetter(logname) }),
          timestamp(),
  		    logFormat
  		  ),
  			maxsize: 40000,
    		maxFiles: 10,
  		})
    ]
  });

  return logger;
}
