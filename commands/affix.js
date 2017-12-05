const request = require('request');
const config = require('../config.json');
const winston = require('winston');
const chalk = require('chalk');
const util = require('util');
const pad = require('pad');

const iconRenderUrl = 'https://render-%s.worldofwarcraft.com/icons/56/%s.jpg';
const bilgewaterIconUrl = 'https://i.imgur.com/zjBxppj.png';

const mythicPlusUrl = 'https://mythicpl.us/';
const affixUrl = 'http://www.wowhead.com/affix=%s'

const weeklyAffixReport = `**(4)**[%s](${affixUrl}) **(7)**[%s](${affixUrl}) **(10)**[%s](${affixUrl})`

var region = 'us';

var responseAffixes;
var responseMythicPlus;

var affixList = [
  { "name": "Raging", "difficulty": "med", "id": 6 },
  { "name": "Volcanic", "difficulty": "easy", "id": 3 },
  { "name": "Teeming", "difficulty": "med", "id": 5 },
  { "name": "Explosive", "difficulty": "med", "id": 13 },
  { "name": "Bolstering", "difficulty": "med", "id": 7 },
  { "name": "Grievous", "difficulty": "med", "id": 12 },
  { "name": "Sanguine", "difficulty": "easy", "id": 8 },
  { "name": "Bursting", "difficulty": "med", "id": 11 },
  { "name": "Necrotic", "difficulty": "hard", "id": 4 },
  { "name": "Skittish", "difficulty": "hard", "id": 2 },
  { "name": "Quaking", "difficulty": "med", "id": 14 },
  { "name": "Fortified", "difficulty": "hard", "id": 10 },
  { "name": "Tyrannical", "difficulty": "hard", "id": 9 }
];

var affixSchedule = [
  [6, 3, 9],
  [5, 13, 10],
  [7, 12, 9],
  [8, 3, 10],
  [11, 2, 9],
  [5, 14, 10],
  [6, 4, 9],
  [7, 2, 10],
  [5, 4, 9],
  [8, 12, 10],
  [7, 13, 9],
  [11, 14, 10]
];

exports.run = function(client, message, args) {

  if (args.length > 1) {
    sendUsageResponse(message);
    return;
  }

  var getSchedule = false;

  if (args.length === 1) {
    if (args[0] === '-schedule') {
      getSchedule = true;
    } else {
      sendUsageResponse(message);
      return;
    }
  }

  request('https://raider.io/api/v1/mythic-plus/affixes?region=us', { json: true }, (err, res, body) => {
    if (err) {
      var owner = client.users.get(config.ownerID);
      message.channel.send(`Something's not quite right... Complain to ${owner}`);
      return console.log(err);
    }

    responseAffixes = res.body;

    var affixes = responseAffixes.affix_details;

    if (!getSchedule) {
      sendAffixResponse(affixes, message);
    } else {
      sendScheduleResponse(affixes, message);
    }

  });
};

function getFutureWeek(thisWeekIndex, weeksAhead) {
  var futureWeekIndex = thisWeekIndex + weeksAhead;
  if (futureWeekIndex >= affixSchedule.length) {
    futureWeekIndex -= (affixSchedule.length);
  }

  return affixSchedule[futureWeekIndex];
}

function getWeeklyAffixes(affixIds) {
  var affixes = ['', '', ''];
  for (var i = 0; i < affixIds.length; i++) {
    for (var j = 0; j < affixList.length; j++) {
      if (affixIds[i] === affixList[j].id) {
        affixes[i] = affixList[j];
        break;
      }
    }
  }
  return affixes;
}

function sendUsageResponse(message) {
  var usage = `Usage: \n\n${config.prefix}affix\n\nOptional Arguments:\n\n-schedule     Get the schedule for Mythic+ affixes`;
    var usageFormatted = '```' + usage + '```';
    message.channel.send(usageFormatted);
    return;
}

function sendAffixResponse(affixes, message) {
  var mpIconUrl = util.format(iconRenderUrl, region, 'inv_relics_hourglass');
  var thisWeek = [0, 0, 0]
  var thisWeekIndex = 0;

  for (var i = 0; i < affixes.length; i++) {
    for (var j = 0; j < affixList.length; j++) {
      if (affixes[i].name === affixList[j].name) {
        thisWeek[i] = affixList[j].id;
        break;
      }
    }
  }

  for (var i = 0; i < affixSchedule.length; i++) {
    if (affixSchedule[i].every(function(u, i) {
        return u === thisWeek[i];
      })
    ) {
      thisWeekIndex = i;
      break;
    }
  }


  var nextWeek = getWeeklyAffixes(getFutureWeek(thisWeekIndex, 1));
  var nextWeeksAffixesString = util.format(weeklyAffixReport, nextWeek[0].name, nextWeek[0].id, nextWeek[1].name,
  nextWeek[1].id, nextWeek[2].name, nextWeek[2].id);

  message.channel.send({embed: {
    color: 0xffb807,
    author: {
      name: 'Mythic+ Affixes This Week',
      icon_url: mpIconUrl
     },
     //title: 'Retrieved from Raider.io',
     //url: 'https://raider.io/mythic-plus',
     thumbnail: {
       url: mpIconUrl
     },
     fields: [
       {
         name: `(4) ${affixes[0].name}`,
         value: `${affixes[0].description} [Read More.](${affixes[0].wowhead_url})`,
       },
       {
         name: `(7) ${affixes[1].name}`,
         value: `${affixes[1].description} [Read More.](${affixes[1].wowhead_url})`,
       },
       {
         name: `(10) ${affixes[2].name}`,
         value: `${affixes[2].description} [Read More.](${affixes[2].wowhead_url})\n\n` +
         `[Weekly Leaderboard](${responseAffixes.leaderboard_url})`,
       },
       {
         name: 'Next Week',
         value: nextWeeksAffixesString,
         inline: true
       },
       {
         name: 'Rotation',
         value: `\`${config.prefix}affix -schedule\``,
         inline: true
       }
     ],
     footer: {
       icon_url: bilgewaterIconUrl,
       text: 'Powered by Bilgewater Bot'
     },
     timestamp: new Date()
   }});
}

function sendScheduleResponse(affixes, message) {
  var mpIconUrl = util.format(iconRenderUrl, region, 'inv_relics_hourglass');
  var thisWeek = [0, 0, 0]
  var thisWeekIndex = 0;

  for (var i = 0; i < affixes.length; i++) {
    for (var j = 0; j < affixList.length; j++) {
      if (affixes[i].name === affixList[j].name) {
        thisWeek[i] = affixList[j].id;
        break;
      }
    }
  }

  for (var i = 0; i < affixSchedule.length; i++) {
    if (affixSchedule[i].every(function(u, i) {
        return u === thisWeek[i];
      })
    ) {
      thisWeekIndex = i;
      break;
    }
  }

  var affixScheduleString = '';
  for (var i = 0; i < affixSchedule.length; i++) {
    var week = getWeeklyAffixes(affixSchedule[i]);
    var weekString = '';
    weekString += pad(`(4) ${week[0].name}`, 16);
    weekString += pad(`(7) ${week[1].name}`, 16);
    weekString += pad(`(10) ${week[2].name}`, 16);
    if (i === thisWeekIndex) {
        affixScheduleString += `** ${weekString} (\*)**`;
    } else {
      affixScheduleString += weekString;
    }
    affixScheduleString += '\n';
  }

  affixScheduleString += '\n\n**(\*)** = This Week';

  message.channel.send({embed: {
    color: 0xffb807,
    author: {
      name: 'Mythic+ Affixes',
      icon_url: mpIconUrl
     },
     title: 'Additional Info',
     url: 'https://mythicpl.us/',
     description: 'Keystones are on a 12 week rotation! Each week is something new!',
     thumbnail: {
       url: mpIconUrl
     },
     fields: [
       {
         name: 'Schedule',
         value: affixScheduleString,
       }
     ],
     footer: {
       icon_url: bilgewaterIconUrl,
       text: 'Powered by Bilgewater Bot'
     },
     timestamp: new Date()
   }});
}
