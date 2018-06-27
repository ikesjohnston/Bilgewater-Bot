const config = require('../config.json');
const util = require('util');
const request = require('request');
const database = require('better-sqlite3');
const bookmark = require('./bookmarks');

const common = require('..//util//common');
const logging = require('..//util//logging');
const warcraftLogs = require('..//util//warcraftLogs');

const zoneImageUrl = 'https://www.warcraftlogs.com/img/icons/warcraft/zone-%d-small.jpg';
const encounterImageUrl = 'https://www.warcraftlogs.com/img/bosses/%d-icon.jpg';
const warcraftLogsIconUrl = 'https://i.imgur.com/u4ixFem.png'

const characterLogsUrl = 'https://www.warcraftlogs.com/rankings/character/%s/%s/#difficulty=%s&metric=%s';

const requestZoneUrl = 'https://www.warcraftlogs.com:443/v1/zones?api_key=%s';
const requestRaidParsesUrl = 'https://www.warcraftlogs.com:443/v1/parses/character/%s/%s/%s?zone=%s&metric=%s&api_key=%s';
const requestEncounterParseUrl = 'https://www.warcraftlogs.com:443/v1/parses/character/%s/%s/%s?zone=%s&encounter=%s&metric=%s&api_key=%s';

const zoneLogsUrl = 'https://www.warcraftlogs.com/rankings/%s#difficulty=%s&metric=%s';
const encounterLogsUrl = '&boss=%s';

const reportUrl = 'https://www.warcraftlogs.com/reports/%s#fight=%s&type=summary';

const zoneIds = [4, 5, 6, 7, 8, 10, 12, 11, 13, 17];

const zoneNames = ['tot', 'soo', 'hm', 'brf', 'hfc', 'en', 'tov', 'nh', 'tos', 'abt'];

const validDifficulties = ['n', 'h', 'm'];

const difficulyIds = [3, 4, 5]

const difficultyNames = ['Normal', 'Heroic', 'Mythic'];

const validMetrics = ['dps', 'hps'];

var character = '';
var realm = '';
var region = '';

var zone = '';
var zoneId = '';
var zoneName = '';
var difficulty = '';
var encounterId = '';
var encounterName = '';
var metric = '';

var zoneImgUrl = '';
var encounterImgUrl = '';

var requestParsesUrl = '';

var embedColor = 0xccc05b;

exports.run = function(client, message, args) {

  var requestZones = requestZoneUrl.replace('%s', config.warcraftLogs);

  request(requestZones, { json: true }, (err, res, body) => {
    if (err) {
      var owner = client.users.get(config.ownerID);
      message.channel.send(`Something's not quite right... Error requesting zones from Warcraft Logs. Complain to ${owner}`);
      logging.logsLogger.log({
        level: 'Error',
        message: `(logs.js:run) Request for Zones from Warcraft Logs failed: ${err}`
      });
      return;
    }

    var responseZones = res.body;

    character = '';
    realm = '';
    region = 'us';

    zone = '';
    zoneId = '';
    zoneName = '';
    difficulty = 'n';
    encounterId = '';
    encounterName = '';
    metric = 'dps';


    var bookmarkFound = false;
    var mainFound = false;

    if(args.length >= 1) {
      if (args[0] === 'raids') {
        requestRaids(client, message, responseZones);
        return;
      } else if (args[0] === 'encounters') {
        zone = args[1];
        requestEncounters(client, message, responseZones, zone);
        return;
      } else {
        var main = bookmark.findMain(message.author.id);
        var bookmarkValues = bookmark.findBookmark(message.author.id, args[0]);
        if(bookmarkValues != undefined) {
          character = bookmarkValues.character;
          realm = bookmarkValues.realm;
          region = bookmarkValues.region;
          bookmarkFound = true;
        } else
        if (main != undefined) {
          character = main.character;
          realm = main.realm;
          region = main.region;
          mainFound = true;
        }
      }
    }

    if (args.length === 0 || (!mainFound && !bookmarkFound && args.length < 3) || (bookmarkFound && args.length < 2)) {
      sendUsageResponse(message);
      return;
    } else {
      var optionalArgStart = 3;
      if(mainFound && zoneNames.includes(args[0])) {
        zone = args[0];
        optionalArgStart = 1;
      } else
      if(bookmarkFound) {
        zone = args[1];
        optionalArgStart = 2;
      } else {
        character = args[0];
        realm = args[1];
        zone = args[2];
      }

      for (var i = optionalArgStart; i < args.length; i++) {
        switch (args[i]) {
          case '-r':
            if (i >= args.length - 1) {
              var errorMessage = `Region flag given but no region specified. Valid regions are us, eu, kr, and tw.`;
              var errorMessageFormatted = '```' + errorMessage + '```';
              message.channel.send(errorMessageFormatted);
              return;
            }
            i++;
            if (!isValidRegion(args[i])) {
                var errorMessage = `Invalid region. Valid regions are us, eu, kr, and tw.`;
                var errorMessageFormatted = '```' + errorMessage + '```';
                message.channel.send(errorMessageFormatted);
                return;
            }
            region = args[i];
            break;
          case '-d':
            if (i >= args.length - 1) {
              var errorMessage = `Difficulty flag given but no difficulty specified. Valid difficulties are n, h, and m`;
              var errorMessageFormatted = '```' + errorMessage + '```';
              message.channel.send(errorMessageFormatted);
              return;
            }
            i++;
            if (!isValidDifficulty(args[i])) {
                var errorMessage = `Invalid difficulty. Valid difficulties are n, h, and m.`;
                var errorMessageFormatted = '```' + errorMessage + '```';
                message.channel.send(errorMessageFormatted);
                return;
            }
            difficulty = args[i]
            break;
          case '-e':
            if (i >= args.length - 1) {
              var errorMessage = `Encounter flag given but no encounter ID specified. Type ${config.prefix}log encounters ` +
              `<raid> for a list of encounters`;
              var errorMessageFormatted = '```' + errorMessage + '```';
              message.channel.send(errorMessageFormatted);
              return;
            }
            i++;
            if (!isValidEncounter(responseZones, zone, args[i])) {
                var errorMessage = `Invalid encounter. Type ${config.prefix}logs encounters <raid> for a list of encounter IDs.`;
                var errorMessageFormatted = '```' + errorMessage + '```';
                message.channel.send(errorMessageFormatted);
                return;
            }
            encounterId = args[i];
            break;
          case '-m':
            if (i >= args.length - 1) {
              var errorMessage = `Metric flag given but no metric specified. Valid metrics are dps and hps.`;
              var errorMessageFormatted = '```' + errorMessage + '```';
              message.channel.send(errorMessageFormatted);
              return;
            }
            i++;
            if (!isValidMetric(args[i])) {
                var errorMessage = `Invalid metric. Valid metrics are dps and hps.`;
                var errorMessageFormatted = '```' + errorMessage + '```';
                message.channel.send(errorMessageFormatted);
                return;
            }
            metric = args[i];
            break;
        }
      }
      requestParses(client, message, responseZones);
    }
  });
};

function requestRaids(client, message, responseZones) {
  var raids = '';
  for (var i = 0; i < zoneIds.length; i++) {
    var zoneId = zoneIds[i];
    for (var j = 0; j < responseZones.length; j++) {
      if (responseZones[j].id === zoneId) {
        var zoneKey = zoneIds[i];
        var zoneName = zoneNames[zoneIds.indexOf(zoneKey)];
        if (zoneName.length === 2) {
          zoneName += ' ';
        }
        raids += `\n${zoneName} - ${responseZones[j].name}`
        break;
      }
    }
  }
  var availableRaids = `\`\`\`Available raids are: \n${raids}\`\`\``;
  message.channel.send(availableRaids);
}

function requestEncounters(client, message, responseZones, zone) {
  if (!isValidZone(zone)) {
    var errorMessage = `\`\`\`Invalid raid. Type ${config.prefix}logs raids for a list of valid raids.\`\`\``;
    message.channel.send(errorMessage);
  } else {
    var zoneFound = false;
    var encounters = '';
    var zoneId = zoneIds[zoneNames.indexOf(zone)];
    var zoneName;
    for (var i = 0; i < responseZones.length; i++) {
      if (responseZones[i].id == zoneId) {
        zoneFound = true;
        zoneName = responseZones[i].name;
        var encountersList = responseZones[i].encounters;
        for (var j = 0; j < encountersList.length; j++) {
          encounters += `\n${responseZones[i].encounters[j].id} - ${responseZones[i].encounters[j].name}`
        }
        break;
      }
    }
    if (zoneFound) {
      var availableEncounters = `Available encounters for ${zoneName} are: \n${encounters}`;
      var availableEncountersFormatted = '```' + availableEncounters + '```';
      message.channel.send(availableEncountersFormatted);
    } else {
      var owner = client.users.get(config.ownerID);
      var errorMessage = `\`\`\`Something's not quite right... Zone no longer exists. Complain to ${owner}\`\`\``;
      message.channel.send(errorMessage);
    }
  }
}

function requestParses(client, message, responseZones) {
  if (!isValidZone(zone)) {
    var errorMessage = `\`\`\`Invalid raid or bad bookmark. Type ${config.prefix}logs raids for a list of valid raids.\`\`\``;
    message.channel.send(errorMessage);
  } else {
    var zoneId = zoneIds[zoneNames.indexOf(zone)];
    zoneName = getZoneName(responseZones, zoneId);
    requestParsesUrl = util.format(requestRaidParsesUrl, character, realm, region, zoneId, metric, config.warcraftLogs);
      message.reply("fetching logs for you...")
    request(requestParsesUrl, { json: true }, (err, res, body) => {
      if (err) {
        var owner = client.users.get(config.ownerID);
        message.channel.send(`Something's not quite right... Error requesting parses from Warcraft Logs. Complain to ${owner}`);
        logging.logsLogger.log({
          level: 'Error',
          message: `(logs.js:requestParses) Request for parses from Warcraft Logs failed: ${err}`
        });
        return;
      }

      responseParses = res.body;

      if (responseParses.status === 400) {
        var errorMessage = '\`\`\`Character not found. Check region and spelling.\`\`\`';
        message.channel.send(errorMessage);
        return;
      } else {
        zoneImgUrl = zoneImageUrl.replace('%d', zoneId);
        if(encounterId === '') {
          sendRaidParseResponse(message, responseZones, responseParses, zoneId);
        } else {
          sendEncounterParseResponse(message, responseZones, responseParses, zoneId, encounterId)
        }
      }
    });
  }
}

function isValidZone(zone) {
  return zoneNames.includes(zone);
}

function isValidEncounter(responseZones, zone, encounterId) {
  var zoneId = zoneIds[zoneNames.indexOf(zone)];
  for (var i = 0; i < responseZones.length; i++) {
    if (responseZones[i].id == zoneId) {
      var encountersList = responseZones[i].encounters;
      for (var j = 0; j < encountersList.length; j++) {
        if (encountersList[j].id.toString() === encounterId) {
          encounterName = encountersList[j].name;
          return true;
        }
      }
    }
  }
  return false;
}

function isValidDifficulty(difficulty) {
  for (var i = 0; i < validDifficulties.length; i++) {
    if (validDifficulties[i].toLowerCase() == difficulty.toLowerCase())
      return true;
  }
  return false;
}

function isValidMetric(metric) {
  for (var i = 0; i < validMetrics.length; i++) {
    if (validMetrics[i].toLowerCase() == metric.toLowerCase())
      return true;
  }
  return false;
}

function getZoneName(responseZones, zoneId) {
  for (var i = 0; i < responseZones.length; i++) {
    if (responseZones[i].id == zoneId)
      return responseZones[i].name;
  }
}

function sendRaidParseResponse(message, responseZones, responseParses, zoneId) {
  encounterImgUrl = zoneImgUrl;

  var difficultyIndex = validDifficulties.indexOf(difficulty);
  var difficultyName = difficultyNames[difficultyIndex];
  var difficultyId = difficulyIds[difficultyIndex];
  var charId;

  var bestPerfAvg = 0;
  var bestPerfSum = 0;
  var bestPerfNum = 0;
  var medPerfAvg = 0;
  var medPerfSum = 0;
  var medPerfNum = 0;
  var killsSeen = 0;
  var allStarPoints = 0;
  var globalLogsUrl = util.format(zoneLogsUrl, zoneId, difficultyId, metric);
  var charLogsUrl = '';

  var lastReportTime = 0;
  var lastReportId;
  var bestParse = 0;
  var bestReportId;

  var logsFound = false;

  for (var i = 0; i < responseParses.length; i++) {
    if (responseParses[i].difficulty === difficultyId) {
      logsFound = true;
      var specs = responseParses[i].specs;
      for (var j = 0; j < specs.length; j++) {
        if (specs[j].spec === 'Melee') {
          continue;
        }
        bestPerfSum += specs[j].best_historical_percent
        bestPerfNum++;
        medPerfSum += specs[j].historical_median;
        medPerfNum++;
        allStarPoints += specs[j].best_allstar_points;
        killsSeen += specs[j].historical_total;
        //console.log(specs[j].data);
        var data = specs[j].data;
        for (var k = 0; k < data.length; k++) {
          //console.log(data[k]);
          if(data[k].start_time > lastReportTime) {
            lastReportTime = data[k].start_time;
            lastReportId = data[k].report_code;
          }
          if (k === 0) {
            charLogsUrl = `${util.format(characterLogsUrl, data[k].character_id, zoneId, difficulty, metric)}`;
          }
        }
      }
    }
  }

  if (logsFound) {
    bestPerfAvg = (bestPerfSum / bestPerfNum).toFixed(1)
    medPerfAvg = (medPerfSum / medPerfNum).toFixed(1)
    allStarPoints = allStarPoints.toFixed(1);
  } else {
    var charSummary = util.format(charLogsUrl, region, realm, character);
    var errorMessage = `\`\`\`No logs for ${common.capitalizeFirstLetter(character)} @ ${common.capitalizeFirstLetter(realm)} found for ${difficultyName} ${zoneName}.\`\`\``;
    message.channel.send(errorMessage);
    return;
  }

  var lastRunUrl = util.format(reportUrl, lastReportId, '-2');
  var charLogs = `[Full Logs](${charLogsUrl}) | [Last Report](${lastRunUrl})`
  message.channel.send({embed: {
     color: embedColor,
     author: {
       name: `Rankings for ${common.capitalizeFirstLetter(character)} @ ${common.capitalizeFirstLetter(realm)}`,
       icon_url: zoneImgUrl
      },
      title: `${difficultyName} ${zoneName}`,
      url: globalLogsUrl,
      thumbnail: {
        url: encounterImgUrl
      },
      fields: [
        {
          name: 'Best Perf. Avg',
          value: bestPerfAvg.toString(),
          inline: true
        },
        {
          name: 'Median Perf. Avg',
          value: medPerfAvg.toString(),
          inline: true
        },
        {
          name: 'Kills Seen',
          value: killsSeen.toString(),
          inline: true
        },
        {
          name: 'All Star Points',
          value: allStarPoints.toString(),
          inline: true
        },
        {
          name: 'Links',
          value: charLogs
        }
      ],
      footer: {
        icon_url: warcraftLogsIconUrl,
        text: 'Raid Logs | Powered by Warcraft Logs'
      },
  }});
}

function sendEncounterParseResponse(message, responseZones, responseParses, zoneId, encounterId) {
  encounterImgUrl = encounterImageUrl.replace('%d', encounterId);

  var difficultyIndex = validDifficulties.indexOf(difficulty);
  var difficultyName = difficultyNames[difficultyIndex];
  var difficultyId = difficulyIds[difficultyIndex];
  var charId;

  var medianPercentile = 0;
  var avgPercentile = 0;
  var killsSeen = 0;
  var bestPsName = `Best ${metric.toUpperCase()}`;
  var bestPs = 0;
  var fastestKill = 0;
  var allStarPoints = 0;
  var globalLogsUrl = util.format(zoneLogsUrl + encounterLogsUrl, zoneId, difficultyId, metric, encounterId);
  var charLogsUrl = '';

  var fightId;
  var lastReportId;
  var bestParse = 0;
  var bestReportId;

  var logsFound = false;

  for (var i = 0; i < responseParses.length; i++) {
    if (responseParses[i].name === encounterName && responseParses[i].difficulty === difficultyId) {
      //console.log(responseParses[i]);
      logsFound = true;
      var specs = responseParses[i].specs;
      for (var j = 0; j < specs.length; j++) {
        allStarPoints = specs[j].best_allstar_points;
        killsSeen = specs[j].historical_total;
        medianPercentile = specs[j].historical_median.toFixed();
        avgPercentile = specs[j].historical_avg.toFixed();
        bestPs = specs[j].best_persecondamount.toLocaleString();
        fastestKill = common.msToTime(specs[j].best_duration);
        var data = specs[j].data;
        for (var k = 0; k < data.length; k++) {
          //console.log(data[k]);
          if (k === 0) {
            fightId = data[k].report_fight;
            lastReportId = data[k].report_code;
            charLogsUrl = util.format(characterLogsUrl + encounterLogsUrl, data[k].character_id, zoneId, difficulty, metric, encounterId);
          }
          if (data[k].historical_percent > bestParse) {
            bestParse = data[k].historical_percent;
            bestReportId = data[k].report_code;
          }
        }
      }
    }
  }
  if (logsFound) {
    allStarPoints = allStarPoints.toFixed(1);
  } else {
    var errorMessage = `\`\`\`No logs for ${common.capitalizeFirstLetter(character)} @ ${common.capitalizeFirstLetter(realm)} found for ${difficultyName} ${encounterName}.\`\`\``;
    message.channel.send(errorMessage);
    return;
  }

  var charLogs = '';
  if (charLogsUrl != '') {
    var lastReportUrl = util.format(reportUrl, lastReportId, fightId);
    var bestReportUrl = util.format(reportUrl, bestReportId, fightId);
    charLogs = `\n\n[Full Logs](${charLogsUrl}) | [Last Fight](${lastReportUrl}) | [Best Fight](${bestReportUrl})`;
  }

  message.channel.send({embed: {
     color: embedColor,
     author: {
       name: `Rankings for ${common.capitalizeFirstLetter(character)} @ ${common.capitalizeFirstLetter(realm)}`,
       icon_url: zoneImgUrl
      },
      title: `${difficultyName} ${encounterName}`,
      url: globalLogsUrl,
      thumbnail: {
        url: encounterImgUrl
      },
      fields: [
        {
          name: 'Median Percentile',
          value: medianPercentile,
          inline: true
        },
        {
          name: 'Avg Percentile',
          value: avgPercentile,
          inline: true
        },
        {
          name: 'Kills Seen',
          value: killsSeen,
          inline: true
        },
        {
          name: bestPsName,
          value: bestPs,
          inline: true
        },
        {
          name: 'Fastest Kill',
          value: fastestKill,
          inline: true
        },
        {
          name: 'All Star Points',
          value: allStarPoints,
          inline: true
        },
        {
          name: 'Links',
          value: charLogs
        }
      ],
      footer: {
        icon_url: warcraftLogsIconUrl,
        text: 'Encounter Logs | Powered by Warcraft Logs'
      }
  }});
}

function sendUsageResponse(message) {
  var usage = `\`\`\`Usage: \n\n${config.prefix}logs <character> <realm> <raid> \n---------------OR---------------\n${config.prefix}logs <bookmark> <raid>\n\nOptional Arguments:` +
    `\n\n-r <region>       Valid regions are us(*), eu, kr, and tw\n-d <difficulty>   Valid difficulties are n(*), h, and m\n-e <encounter>` +
    `    See \"Additional Info\"\n-m <metric>       Valid metrics are dps(*) and hps\n\n(*) = Default Value\n\nAdditional Info:\n\nType \"${config.prefix}logs ` +
    `raids\" for a list of supported raids. \nType \"${config.prefix}logs encounters <raid>\" for a list of encounter IDs.\`\`\``;
    message.channel.send(usage);
    return;
}
