const config = require('../config.json');
const winston = require('winston');
const chalk = require('chalk');
const blizzard = require('blizzard.js').initialize({ apikey: config.battlenet });
const util = require('util');
const request = require('request');

const bilgewaterIconUrl = 'https://i.imgur.com/zjBxppj.png';
const charRenderUrl = 'https://render-%s.worldofwarcraft.com/character/%s';
const iconRenderUrl = 'https://render-%s.worldofwarcraft.com/icons/%d/%s.jpg';

const iconSize = 56;

const requestRaiderIoUrl = 'https://raider.io/api/v1/characters/profile?region=%s&realm=%s&name=%s' +
'&fields=gear%2Craid_progression%2Cmythic_plus_weekly_highest_level_runs';

const armoryUrl = 'https://worldofwarcraft.com/%s/character/%s/%s';
const raiderIoUrl = 'https://raider.io/characters/%s/%s/%s';
const warcraftLogsUrl = 'https://www.warcraftlogs.com/character/%s/%s/%s';

const validRegions = ['us', 'eu', 'kr', 'tw'];

var character;
var realm;
var region;

exports.run = function(client, message, args) {
  region = 'us';

  if(args.length < 2) {
    sendUsageResponse(message);
    return;
  }
  
  character = args[0];
  realm = args[1];//.replace('-', ' ');

  for (var i = 1; i < args.length; i++) {
    switch (args[i]) {
      case '-r':
        flagGiven = true;
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
    }
  }

  var requestRaiderIo = util.format(requestRaiderIoUrl, region, realm, character);
  request(requestRaiderIo, { json: true }, (err, res, body) => {
    if (err) {
      var owner = client.users.get(config.ownerID);
      message.channel.send(`Something's not quite right... Complain to ${owner}`);
      return console.log(err);
    }

    var responseRaiderIo = res.body;
    buildResponse(client, message, args, responseRaiderIo);
  });
};

function buildResponse(client, message, args, responseRaiderIo) {
  var races;
  blizzard.wow.data('character-races', { origin: region })
  .then(response => {
    races = response.data.races;
  });

  var classes;
  blizzard.wow.data('character-classes', { origin: region })
  .then(response => {
    classes = response.data.classes;
  });

  blizzard.wow.character(['profile', 'stats', 'talents', 'items', 'pvp', 'titles'], { origin: region, realm: realm, name: character })
  .then(response => {
    var characterImageUrlThumbnail = util.format(charRenderUrl, region, response.data.thumbnail);
    var characterImageUrlMain = characterImageUrlThumbnail.replace('avatar', 'main');
    var characterImageUrlInset = characterImageUrlThumbnail.replace('avatar', 'inset');

    // Blue embed color for alliance, red for horde
    var embedColor = 0x004fce;
    if(response.data.faction == 1) {
      embedColor = 0xad0505;
    }

  //var raids = response.data.progression.raids;

    var charLevel = response.data.level;

    var charRace;
    for(i = 0; i < races.length; i++) {
      if(races[i].id == response.data.race) {
        charRace = races[i];
        break;
      }
    }

    var charClass;
    for(i = 0; i < classes.length; i++) {
      if(classes[i].id == response.data.class) {
        charClass= classes[i];
        break;
      }
    }

    var stats = response.data.stats;

    var items = response.data.items;

    var pvpBrackets = response.data.pvp.brackets;

    var titles = response.data.titles;
    var titleSelected = '%s';
    for(i = 0; i < titles.length; i++) {
      if(titles[i].selected) {
        titleSelected = titles[i].name;
        break;
      }
    }

    var charName = titleSelected.replace('%s', response.data.name);

    var talents = response.data.talents;
    var currentSpec;
    for(i = 0; i < talents.length; i++) {
      if(talents[i].selected) {
        currentSpec = talents[i];
        break;
      }
    }

    var specRole = currentSpec.spec.role;
    var specIconUrl = util.format(iconRenderUrl, region, iconSize, currentSpec.spec.icon);

    var mainStat = 'Intellect';
    var mainStatValue = stats.int;

    if(stats.agi > mainStatValue) {
      mainStat = 'Agility';
      mainStatValue = stats.agi;
    }

    if(stats.str > mainStatValue) {
      mainStat = 'Strength';
      mainStatValue = stats.str;
    }

    var versBonus;
    if(specRole == 'DPS'){
      versBonus = stats.versatilityDamageDoneBonus;
    } else
    if(specRole == 'HEALING') {
      versBonus = stats.versatilityHealingDoneBonus;
    } else
    if(specRole == 'TANK') {
      versBonus = stats.versatilityDamageTakenBonus;
    }

    var mpWeeklyBests = responseRaiderIo.mythic_plus_weekly_highest_level_runs;
    var weeklyBestReport;
    if(mpWeeklyBests.length == 0) {
      weeklyBestReport = 'No Mythic+ dungeons \ncompleted this week.';
    } else {
      var weeklyBest = mpWeeklyBests[0];
      var weeklyBestTime = msToTime(weeklyBest.clear_time_ms);
      weeklyBestResult = upgradesToResult(weeklyBest.num_keystone_upgrades);
      weeklyBestReport = `[+${weeklyBest.mythic_level} ${weeklyBest.dungeon}](${weeklyBest.url})\nTime: ` +
      `${weeklyBestTime}\nResult: ${weeklyBestResult}\nScore: ${weeklyBest.score}`;
    }

    var artifactTraits = responseRaiderIo.gear.artifact_traits;

    var raidProgression = responseRaiderIo.raid_progression;
    var progressionSummary = `**EN:**  ${raidProgression['the-emerald-nightmare'].summary}\n` +
    `**ToV:** ${raidProgression['trial-of-valor'].summary}\n**NH:**  ${raidProgression['the-nighthold'].summary}\n` +
    `**ToS:** ${raidProgression['tomb-of-sargeras'].summary}\n**ABT:** ${raidProgression['antorus-the-burning-throne'].summary}`;

    var armoryRegion = 'en-us';
    if(region === 'eu') {
      armoryRegion = 'en-gb';
    } else 
    if(region === 'kr') {
      armoryRegion = 'ko-kr';
    } else 
    if(region === 'tw') {
      armoryRegion = 'zh-cn';
    }
    var charArmoryUrl = util.format(armoryUrl, armoryRegion, realm.replace(' ', '-'), character);
    var charRaiderIoUrl = util.format(raiderIoUrl, region, realm.replace(' ', '-'), character);
    var charLogsUrl = util.format(warcraftLogsUrl, region, realm.replace(' ', '-'), character);
    var charLinks = `[WarcraftLogs](${charLogsUrl}) | [Raider.IO](${charRaiderIoUrl})`;
    message.channel.send({embed: {
       color: embedColor,
       title: `Level ${charLevel} ${charRace.name} ${currentSpec.spec.name} ${charClass.name}\n`,
       url: charArmoryUrl,
       description: `**Average ILVL:** ${items.averageItemLevelEquipped.toLocaleString()}\n**Artifact Traits:** ${artifactTraits}\n` +
       `**Achievement Points:** ${response.data.achievementPoints.toLocaleString()}\n`,
       author: {
         name: `${charName} @ ${response.data.realm}`,
         icon_url: specIconUrl
       },
       thumbnail: {
         url: characterImageUrlThumbnail
       },
       fields: [
         {
           name: 'Stats',
           value: `**${mainStat}:** ${mainStatValue.toLocaleString()} \n**Crit:** ${stats.crit.toFixed(2)}%\n**Haste:** ` +
           `${stats.haste.toFixed(2)}%\n**Mastery:** ${stats.mastery.toFixed(2)}%\n**Versatility:** ${versBonus.toFixed(2)}%\n`,
           inline: true
         },
         {
           name: 'Raid Progression',
           value: progressionSummary,
           inline: true
         },
         {
           name: 'PVP',
           value: `**2v2 Rating:** ${pvpBrackets.ARENA_BRACKET_2v2.rating.toLocaleString()} \n**3v3 Rating:** ` +
           `${pvpBrackets.ARENA_BRACKET_3v3.rating.toLocaleString()} \n**Battleground Rating:** ` +
           `${pvpBrackets.ARENA_BRACKET_RBG.rating.toLocaleString()} \n**Honorable Kills:** ` +
           `${response.data.totalHonorableKills.toLocaleString()} \n`,
           inline: true
         },
         {
           name: 'Mythic+',
           value: `**Weekly Best:**\n${weeklyBestReport}`,
           inline: true
         },
         {
           name: 'Links',
           value: charLinks
         }
       ],
       footer: {
         icon_url: bilgewaterIconUrl,
         text: 'Powered by Bilgewater Bot'
       },
       timestamp: new Date()
     }});
  }).catch(error => {

     winston.log('error', chalk.bgRed(`toon: ${error}\n ${error.stack}`));
     message.channel.send('```Character not found. Check spelling and region.```');
   });
}

function upgradesToResult(keystoneUpgrades) {
  if(keystoneUpgrades < 1)
    return 'Depleted';
  else
    return `+${keystoneUpgrades}`;
}

function isValidRegion(region) {
  for (var i = 0; i < validRegions.length; i++) {
    if (validRegions[i].toLowerCase() == region.toLowerCase())
      return true;
  }
  return false;
}

function sendUsageResponse(message) {
  var usage = `Usage: \n\n${config.prefix}toon <character> <realm>\n\nOptional Arguments:\n\n-r <region>       Valid regions are ` +
    `us(*), eu, kr, and tw\n\n(*) = Default Value`;
    var usageFormatted = '```' + usage + '```';
    message.channel.send(usageFormatted);
    return;
}

function msToTime(duration) {
  var seconds = parseInt((duration/1000)%60);
  var minutes = parseInt((duration/(1000*60))%60);

  seconds = (seconds < 10) ? '0' + seconds : seconds;

  return minutes + 'm ' + seconds + 's';
}
