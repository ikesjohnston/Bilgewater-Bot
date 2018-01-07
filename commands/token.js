var config = require('../config.json');
var blizzard = require('blizzard.js').initialize({ apikey: config.battlenet });

var chalk = require('chalk');
var chalkLog = chalk.white;
var chalkError = chalk.bold.red;

var winston = require('winston');
//winston.add(winston.transports.File, { filename: '../logs/search.log' });

var bilgewaterIconUrl = 'https://i.imgur.com/zjBxppj.png';
var tokenImageUrl = 'http://wowtokenprices.com/assets/wowtokeninterlaced.png';
var wowTokenUrl = 'http://wowtokenprices.com/';

var validRegions = ['us', 'eu', 'kr', 'tw', 'cn'];
var embedColor = 0xccaa00;

var region;
var optionalArgStart = 0;

exports.run = function(client, message, args) {
  var gold = client.emojis.find("name", "gold");
  region = 'us';

  for (var i = optionalArgStart; i < args.length; i++) {
    var arg = args[i].toLowerCase();
    if (arg === '-r') {
      if (i >= args.length - 1) {
        var errorMessage = `\`\`\`Region flag given but no region specified. Valid regions are us, eu, kr, and tw.\`\`\``;
        message.channel.send(errorMessage);
        return;
      }
      i++;
      if (!isValidRegion(args[i])) {
        var errorMessage = `\`\`\`Invalid region. Valid regions are us, eu, kr, and tw.\`\`\``;
        message.channel.send(errorMessage);
        return;
      }
      region = args[i];
    }
    if (arg === '-h') {
      sendUsageResponse(message);
    }
  }

  blizzard.data.token({ access_token: config.battlenetaccess, namespace: `dynamic-${region}`, origin: region })
    .then(response => {
      var tokenPrice = response.data.price / 10000;
      message.channel.send({embed: {
         color: embedColor,
         url: wowTokenUrl,
         description: `[View History](${wowTokenUrl})`,
         author: {
           name: 'WoW Token Price',
           icon_url: tokenImageUrl
         },
         thumbnail: {
           url: tokenImageUrl
         },
         fields: [
           {
             name: `${region.toUpperCase()}`,
             value: `${tokenPrice.toLocaleString()} ${gold.toString()}`
           },
         ],
         footer: {
           icon_url: bilgewaterIconUrl,
           text: 'WoW Token Price Data | Powered by Bilgewater Bot'
         }
       }});
    });
};

function isValidRegion(region) {
  for (var i = 0; i < validRegions.length; i++) {
    if (validRegions[i].toLowerCase() == region.toLowerCase())
      return true;
  }
  return false;
}

function sendUsageResponse(message) {
  var usage = `\`\`\`Usage: \n\n${config.prefix}token\n\nOptional Arguments:\n\n-r <region>       Valid regions are us(*), eu, kr, and tw\n\`\`\``;
    message.channel.send(usage);
    return;
}
