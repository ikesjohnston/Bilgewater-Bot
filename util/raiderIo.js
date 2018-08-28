const config = require('../config.json');
const blizzard = require('blizzard.js').initialize({ apikey: config.battlenet });
const util = require('util');
const request = require('request');

const common = require('..//util//common');
const logging = require('..//util//logging');
const battleNet = require('..//util//battleNet');

const characterUrl = 'https://raider.io/characters/%s/%s/%s';
const requestUrl = 'https://raider.io/api/v1/characters/profile?region=%s&realm=%s&name=%s' +
'&fields=gear%2Craid_progression%2Cmythic_plus_scores%2Cmythic_plus_ranks%2Cmythic_plus_weekly_highest_level_runs';
const detailedUrl = '%2Cmythic_plus_recent_runs%2Cmythic_plus_best_runs%2Cmythic_plus_highest_level_runs';
const dungeonBannerUrl = 'https://assets.raider.io/images/dungeons/%s.jpg';

iconUrl = 'https://i.imgur.com/Y4z99aV.jpg';

// Spell names for dungeon icon rendering
dungeonIcons = {
    'mos': 'achievement_dungeon_mawofsouls',
    'votw': 'achievement_dungeon_vaultofthewardens',
    'nl': 'achievement_dungeon_neltharionslair',
    'hov': 'achievement_dungeon_hallsofvalor',
    'eoa': 'achievement_dungeon_eyeofazshara',
    'dht': 'achievement_dungeon_darkheartthicket',
    'brh': 'achievement_dungeon_blackrookhold',
    'cos': 'achievement_dungeon_courtofstars',
    'aw': 'achievement_dungeon_thearcway',
    'uppr': 'achievement_raid_karazhan',
    'lowr': 'achievement_raid_karazhan',
    'coen': 'spell_warlock_demonicempowerment',
    'sott': 'achievement_boss_triumvirate_darknaaru'
};

// Keystone level achievement IDs
exports.keystoneAchievements = {
  'initiate': 11183,
  'challanger': 11184,
  'conqueror': 11185,
  'master': 11162
};
exports.getCharacterUrl = function(character, realm, region) {
  return util.format(characterUrl, region, realm.replace(' ', '-').replace('\'', ''), character)
}

exports.getRequestUrl = function(character, realm, region) {
  return util.format(requestUrl, region, realm, character);
}

upgradesToResult = function (keystoneUpgrades) {
  if(keystoneUpgrades < 1)
    return 'Depleted';
  else
    return `+${keystoneUpgrades}`;
}

exports.getMythicPlusReport = function (runs, weeklyReport) {
  var runReport = '';
  if(runs === undefined || runs.length == 0) {
    if (weeklyReport) {
      runReport = 'No Mythic+ dungeons \ncompleted this week.';
    } else {
      runReport = 'No Mythic+ dungeons \ncompleted this season.';
    }
  } else {
    var run = runs[0];
    var runTime = common.msToTime(run.clear_time_ms);
    runResult = upgradesToResult(run.num_keystone_upgrades);
    runReport = `[+${run.mythic_level} ${run.dungeon}](${run.url})\nTime: ` +
    `${runTime}\nResult: ${runResult}\nScore: ${run.score}`;
  }
  return runReport;
}

exports.sendMythicPlusResponse = function (character, realm, region, message) {
  message.reply("fetching Mythic+ data for you...");
  var requestRaiderIo = util.format(requestUrl, region, realm, character);
  requestRaiderIo += detailedUrl;
  request(requestRaiderIo, { json: true }, (err, res, body) => {
    if (err) {
      var owner = client.users.get(config.ownerID);
      message.channel.send(`Something's not quite right... Complain to ${owner}`);
      return console.log(err);
    }
    var responseRaiderIo = res.body;

    var charClass;
    var classes;
    blizzard.wow.data('character-classes', { origin: region })
    .then(response => {
      classes = response.data.classes;

      blizzard.wow.character(['titles', 'talents', 'achievements'], { origin: region, realm: realm, name: character })
      .then(response => {

        var lastDungeonIconUrl = util.format(battleNet.iconRenderUrl, region, iconSize, 'inv_relics_hourglass');
        var mythicPlusAuthorIconUrl = util.format(battleNet.iconRenderUrl, region, iconSize, 'inv_relics_hourglass');
        console.log(mythicPlusAuthorIconUrl);
        var lastDungeonBannerUrl = '';

        for(i = 0; i < classes.length; i++) {
          if(classes[i].id == response.data.class) {
            charClass= classes[i];
            break;
          }
        }

        var embedColor = battleNet.getFactionEmbedColor(response.data.faction);
        var characterNameTitle = battleNet.getNameAndTitle(response.data);

        var charArmoryUrl = battleNet.getArmoryUrl(character, realm, region);
        var charRaiderIoUrl = util.format(characterUrl, region, realm.replace(' ', '-').replace('\'', ''), character);

        var achievementsCompleted = response.data.achievements.achievementsCompleted;
        var mythicPlusSummary = '';
        if (achievementsCompleted.includes(exports.keystoneAchievements.master)) {
          mythicPlusSummary += '\`Keystone Master\`\n';
        } else
        if (achievementsCompleted.includes(exports.keystoneAchievements.conqueror)) {
          mythicPlusSummary += '\`Keystone Conqueror\`\n';
        } else
        if (achievementsCompleted.includes(exports.keystoneAchievements.challanger)) {
          mythicPlusSummary += '\`Keystone Challanger\`\n';
        } else
        if (achievementsCompleted.includes(exports.keystoneAchievements.initiate)) {
          mythicPlusSummary += '\`Keystone Initiate\`\n';
        }

        var talents = response.data.talents;
        var canDPS = false;
        var canHeal = false;
        var canTank = false;
        for(i = 0; i < talents.length; i++) {
          if (talents[i].spec) {
            if(talents[i].spec.role === 'DPS') {
              canDps = true;
            } else
            if(talents[i].spec.role === 'HEALING') {
              canHeal = true;
            } else
            if(talents[i].spec.role === 'TANK') {
              canTank = true;
            }
          }
        }

        var scores = responseRaiderIo.mythic_plus_scores;
        if(scores === undefined || scores.all === 0) {
          message.channel.send('\`\`\`This character has not completed a Mythic+ dungeon this season.\`\`\`');
          return;
        }

        mythicPlusSummary += `**Overall Score:** ${scores.all.toLocaleString()}\n`;;
        var ranks = responseRaiderIo.mythic_plus_ranks;
        var mythicPlusOverallRanks = '';
        var mythicPlusClassRanks = '';

        if(canDps){
          if(scores.dps > 0) {
            mythicPlusSummary += `**DPS Score:** ${scores.dps.toLocaleString()}\n`;
            mythicPlusOverallRanks += `**DPS:** Realm - ${ranks.dps.realm.toLocaleString()} | Region - ${ranks.dps.region.toLocaleString()} | World - ${ranks.dps.world.toLocaleString()}\n`;
            mythicPlusClassRanks += `**DPS:** Realm - ${ranks.class_dps.realm.toLocaleString()} | Region - ${ranks.class_dps.region.toLocaleString()} | World - ${ranks.class_dps.world.toLocaleString()}\n`;
          }
        }
        if(canHeal) {
          if(scores.healer > 0) {
            mythicPlusSummary += `**Healer Score:** ${scores.healer.toLocaleString()}\n`;
            mythicPlusOverallRanks += `**Healer:** Realm - ${ranks.healer.realm.toLocaleString()} | Region - ${ranks.healer.region.toLocaleString()} | World - ${ranks.healer.world.toLocaleString()}\n`;
            mythicPlusClassRanks += `**Healer:** Realm - ${ranks.class_healer.realm.toLocaleString()} | Region - ${ranks.class_healer.region.toLocaleString()} | World - ${ranks.class_healer.world.toLocaleString()}\n`;
          }
        }
        if(canTank) {
          if(scores.tank > 0) {
            mythicPlusSummary += `**Tank Score:** ${scores.tank.toLocaleString()}\n`;
            mythicPlusOverallRanks += `**Tank:** Realm - ${ranks.tank.realm.toLocaleString()} | Region - ${ranks.tank.region.toLocaleString()} | World - ${ranks.tank.world.toLocaleString()}\n`;
            mythicPlusClassRanks += `**Tank:** Realm - ${ranks.class_tank.realm.toLocaleString()} | Region - ${ranks.class_tank.region.toLocaleString()} | World - ${ranks.class_tank.world.toLocaleString()}\n`;
          }
        };

        var mpRecentRuns = responseRaiderIo.mythic_plus_recent_runs;
        var lastRunReport = exports.getMythicPlusReport(mpRecentRuns, false);

        var latestRun = mpRecentRuns[0];
        if (latestRun) {
          lastDungeonIconUrl = util.format(battleNet.iconRenderUrl, region, iconSize, dungeonIcons[latestRun.short_name.toLowerCase()]);
          var dungeon = latestRun.dungeon.toLowerCase().replace(/ /g, '-').replace(/:/g, '').replace(/'/g, '');
          lastDungeonBannerUrl = util.format(dungeonBannerUrl, dungeon);
        }

        var mpWeeklyBests = responseRaiderIo.mythic_plus_weekly_highest_level_runs;
        var weeklyBestReport = exports.getMythicPlusReport(mpWeeklyBests, true);

        var mpSeasonScoreBests = responseRaiderIo.mythic_plus_best_runs;
        var seasonScoreBestReport = exports.getMythicPlusReport(mpSeasonScoreBests, false);

        var mpSeasonLevelBests = responseRaiderIo.mythic_plus_highest_level_runs;
        var seasonLevelBestReport = exports.getMythicPlusReport(mpSeasonLevelBests, false);


        message.channel.send({embed: {
           color: embedColor,
           title: `${characterNameTitle} @ ${response.data.realm}`,
           url: charRaiderIoUrl,
           description: mythicPlusSummary,
           author: {
             name: 'Mythic+ Performance',
             icon_url: mythicPlusAuthorIconUrl
           },
           thumbnail: {
             url: lastDungeonIconUrl
           },
           image: {
             url: lastDungeonBannerUrl
           },
           fields: [
             {
               name: 'All Ranks',
               value: mythicPlusOverallRanks
             },
             {
               name: `${charClass.name} Ranks`,
               value: mythicPlusClassRanks
             },
             {
               name: 'Latest Run',
               value: lastRunReport,
               inline: true
             },
             {
               name: 'Weekly Highest Score',
               value: weeklyBestReport,
               inline: true
             },
             {
               name: 'Season Highest Score',
               value: seasonScoreBestReport,
               inline: true
             },
             {
               name: 'Season Highest Level',
               value: seasonLevelBestReport,
               inline: true
             }
           ],
           footer: {
             icon_url: iconUrl,
             text: 'Mythic+ Performance Data via Raider.IO'
           }
         }});
      }).catch(error => {
         message.channel.send('\`\`\`Character not found. Check spelling and region.\`\`\`');
         logging.toonLogger.log({
           level: 'Error',
           message: `(raiderIo.js:sendMythicPlusResponse) Request to Raider.IO failed for ${character} ${realm} ${region}: ${error.stack}`
         });
      });
    });
  });
}
