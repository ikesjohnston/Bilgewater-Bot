var config = require('../config.json');
const request = require('request');
var bookmark = require('./bookmarks');
var logging = require('../util/logging');

var bilgewaterIconUrl = 'https://i.imgur.com/zjBxppj.png';
var tokenRequestURL = 'https://wowtokenprices.com/current_prices.json';
var tokenImageUrl = 'http://wowtokenprices.com/assets/wowtokeninterlaced.png';
var wowTokenUrl = 'http://wowtokenprices.com/';

var validRegions = ['us', 'eu', 'kr', 'tw', 'cn'];
var embedColor = 0xccaa00;

var region = '';
var optionalArgStart = 0;

exports.run = function(client, message, args) {
  var regionSpecified = false;
  var detailedReport = false;

  var gold = client.emojis.find("name", "gold");
  var changeUp = client.emojis.find("name", "arrowup");
  var changeDown = client.emojis.find("name", "arrowdown");

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
      regionSpecified = true;
    }
    if (arg === '-d') {
      detailedReport = true;
    }
    if (arg === '-h') {
      sendUsageResponse(message);
      return;
    }
  }

  if(!regionSpecified) {
    var main = bookmark.findMain(message.author.id);
    if (main != undefined) {
      region = main.region.toLowerCase();
    }
  }

  // Region name change for WoWTokenPrices feeds
  var regionKey;
  if (region === 'kr') {
    regionKey = 'korea';
  } else 
  if (region === 'tw') {
    regionKey = 'taiwan';
  } else 
  if (region === 'cn') {
    regionKey = 'china';
  } else 
  {
    regionKey = region;
  }

  message.reply("fetching token prices for you...")
  request(tokenRequestURL, { json: true }, (err, res, body) => {
    if (err) {
      message.reply("error getting token prices.")

       logging.priceLogger.log({
         level: 'Error',
         message: `(token.js:run) Request to WoWTokenPrices failed:\n${error.message}`
       });
    }
    var tokenPrice = body[regionKey].current_price;
    var tokenChange = body[regionKey].last_change;
    var changeEmoji;
    if (tokenChange < 0) {
      changeEmoji = changeDown;
    } else {
      changeEmoji = changeUp;
    }
    var footerText = `Last change retrieved ${body[regionKey].time_of_last_change_utc_timezone} UTC via WoWTokenPrices`;

    var reportFeilds = [
      {
        name: 'Current Price',
        value: `${tokenPrice.toLocaleString()}${gold.toString()}`,
        inline: true
      },
      {
        name: `Change`,
        value: `${changeEmoji.toString()} ${tokenChange.toLocaleString()}${gold.toString()}`,
        inline: true
      }
    ];

    if(detailedReport) {
      var oneDayLow = {
        name: `1 Day Low`,
        value: `${body[regionKey]['1_day_low'].toLocaleString()}${gold.toString()}`,
        inline: true
      }
      reportFeilds.push(oneDayLow);
      var oneDayHigh = {
        name: `1 Day High`,
        value: `${body[regionKey]['1_day_high'].toLocaleString()}${gold.toString()}`,
        inline: true
      }
      reportFeilds.push(oneDayHigh);
      var sevenDayLow = {
        name: `7 Day Low`,
        value: `${body[regionKey]['7_day_low'].toLocaleString()}${gold.toString()}`,
        inline: true
      }
      reportFeilds.push(sevenDayLow);
      var sevenDayHigh = {
        name: `7 Day High`,
        value: `${body[regionKey]['7_day_high'].toLocaleString()}${gold.toString()}`,
        inline: true
      }
      reportFeilds.push(sevenDayHigh);
      var thirtyDayLow = {
        name: `30 Day Low`,
        value: `${body[regionKey]['30_day_low'].toLocaleString()}${gold.toString()}`,
        inline: true
      }
      reportFeilds.push(thirtyDayLow);
      var thirtyDayHigh = {
        name: `30 Day High`,
        value: `${body[regionKey]['30_day_high'].toLocaleString()}${gold.toString()}`,
        inline: true
      }
      reportFeilds.push(thirtyDayHigh);
    }

    message.channel.send({embed: {
      color: embedColor,
      url: wowTokenUrl,
      description: `[View History](${wowTokenUrl})`,
      author: {
        name: `${region.toUpperCase()} WoW Token Prices`,
        icon_url: tokenImageUrl
      },
      thumbnail: {
        url: tokenImageUrl
      },
      fields: reportFeilds,
      footer: {
        icon_url: bilgewaterIconUrl,
        text: footerText
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
  var usage = `\`\`\`Usage: \n\n${config.prefix}token\n\nOptional Arguments:\n\n-r <region>       Valid regions are us(*), eu, kr, and tw` + 
  `\n\n-d                Print out a detailed report\n\n(*) = Default Value\`\`\``;
    message.channel.send(usage);
    return;
}
