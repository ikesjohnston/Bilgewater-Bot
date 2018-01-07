var config = require('../config.json');
var blizzard = require('blizzard.js').initialize({ apikey: config.battlenet });
var util = require('util');
var request = require('request');
var database = require('better-sqlite3');
var bookmark = require('./bookmarks');
var cheerio = require('cheerio');

var chalk = require('chalk');
var chalkLog = chalk.white;
var chalkError = chalk.bold.red;

var winston = require('winston');
//winston.add(winston.transports.File, { filename: '../logs/search.log' });

var bilgewaterIconUrl = 'https://i.imgur.com/zjBxppj.png';
var charRenderUrl = 'https://render-%s.worldofwarcraft.com/character/%s';
var iconRenderUrl = 'https://render-%s.worldofwarcraft.com/icons/%d/%s.jpg';

var iconSize = 56;

var requestRaiderIoUrl = 'https://raider.io/api/v1/characters/profile?region=%s&realm=%s&name=%s' +
'&fields=gear%2Craid_progression%2Cmythic_plus_scores%2Cmythic_plus_ranks%2Cmythic_plus_weekly_highest_level_runs';
var detailedRaiderIo = '%2Cmythic_plus_recent_runs%2Cmythic_plus_best_runs%2Cmythic_plus_highest_level_runs';

var armoryUrl = 'https://worldofwarcraft.com/%s/character/%s/%s';
var raiderIoUrl = 'https://raider.io/characters/%s/%s/%s';
var warcraftLogsUrl = 'https://www.warcraftlogs.com/character/%s/%s/%s';

var validRegions = ['us', 'eu', 'kr', 'tw'];

var progressionRaids = [
  {'name': 'The Emerald Nightmare', 'short': 'EN'},
  {'name': 'Trial of Valor', 'short': 'ToV'},
  {'name': 'The Nighthold', 'short': 'NH'},
  {'name': 'Tomb of Sargeras', 'short': 'ToS'},
  {'name': 'Antorus, the Burning Throne', 'short': 'ABT'},
];

// 'Ahead of the Curve' achievement IDs
var aotc = {
  'en': 11194,
  'tov': 11581,
  'nh': 11195,
  'tos': 11874,
  'abt': 12110
};

// 'Cutting Edge' achievement IDs
var ce = {
  'en': 11191,
  'tov': 11580,
  'nh': 11192,
  'tos': 11875,
  'abt': 12111
};

var dungeonBannerUrl = 'https://assets.raider.io/images/dungeons/%s.jpg';

// Spell names for dungeon icon rendering
var dungeonIcons = {
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
var keystoneAchievements = {
  'initiate': 11183,
  'challanger': 11184,
  'conqueror': 11185,
  'master': 11162
};

var character = '';
var realm = '';
var region= '';

exports.run = function(client, message, args) {
  var bookmarkFound = false;
  var optionalArgStart = 1;
  var getCollections = false;
  var getProfessions = false;
  var getAchievements = false;
  var getMythicPlus = false;
  region = 'us';

  if(args.length >= 1) {
    var bookmarkValues = bookmark.findBookmarkValues(message.author.id, args[0]);
    if(bookmarkValues.character != null) {
      character = bookmarkValues.character;
      realm = bookmarkValues.realm;
      region = bookmarkValues.region;
      bookmarkFound = true;
    }
  }

  if(!bookmarkFound) {
    if(args.length < 2) {
      sendUsageResponse(message);
      return;
    }
    optionalArgStart = 2;
    character = args[0];
    realm = args[1];
  }

  for (var i = optionalArgStart; i < args.length; i++) {
    var arg = args[i].toLowerCase();
    if (arg === '-r') {
      flagGiven = true;
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
    } else
    if (arg === '-c' || arg === '-collections') {
      getCollections = true;
    } else
    if ( arg === '-p' || arg === '-professions') {
      getProfessions = true;
    } else
    if ( arg === '-a' || arg === '-achievements') {
      //getAchievements = true; // WIP
    } else if ( arg === '-m' || arg === '-mythicplus') {
      getMythicPlus = true;
    }
  }

  message.reply("fetching character data for you...");
  if (!getCollections && !getProfessions && !getAchievements && !getMythicPlus) {
        buildDefaultResponse(client, message, args);
  }
  if (getCollections) {
    buildCollectionsResponse(client, message, args);
  }
  if (getProfessions) {
    buildProfessionsResponse(client, message, args);
  }
  if (getAchievements) {
    buildAchievementsResponse(client, message, args);
  }
  if (getMythicPlus) {
    buildMythicPlusResponse(client, message, args);
  }
};

function buildDefaultResponse(client, message, args) {
  var requestRaiderIo = util.format(requestRaiderIoUrl, region, realm, character);
  request(requestRaiderIo, { json: true }, (err, res, body) => {
    if (err) {
      var owner = client.users.get(config.ownerID);
      message.channel.send(`Something's not quite right... Complain to ${owner}`);
      return console.log(err);
    }

    var responseRaiderIo = res.body;
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

    blizzard.wow.character(['profile', 'stats', 'items', 'talents', 'pvp', 'titles', 'achievements', 'progression'], { origin: region, realm: realm, name: character })
    .then(response => {
      var characterImageUrlThumbnail = util.format(charRenderUrl, region, response.data.thumbnail);
      var characterImageUrlMain = characterImageUrlThumbnail.replace('avatar', 'main');
      var characterImageUrlInset = characterImageUrlThumbnail.replace('avatar', 'inset');

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
      var achievementsCompleted = response.data.achievements.achievementsCompleted;

      var embedColor = getFactionEmbedColor(response.data.faction);
      var charName = getNameAndTitle(response.data);

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
      if(specRole === 'DPS'){
        versBonus = stats.versatilityDamageDoneBonus;
      } else
      if(specRole === 'HEALING') {
        versBonus = stats.versatilityHealingDoneBonus;
      } else
      if(specRole === 'TANK') {
        versBonus = stats.versatilityDamageTakenBonus;
      }

      var mythicPlusSummary = '';
      if (achievementsCompleted.includes(keystoneAchievements.master)) {
        mythicPlusSummary += '\`Keystone Master\`\n';
      } else
      if (achievementsCompleted.includes(keystoneAchievements.conqueror)) {
        mythicPlusSummary += '\`Keystone Conqueror\`\n';
      } else
      if (achievementsCompleted.includes(keystoneAchievements.challanger)) {
        mythicPlusSummary += '\`Keystone Challanger\`\n';
      } else
      if (achievementsCompleted.includes(keystoneAchievements.initiate)) {
        mythicPlusSummary += '\`Keystone Initiate\`\n';
      }

      var scores = responseRaiderIo.mythic_plus_scores;
      var ranks = responseRaiderIo.mythic_plus_ranks;

      if(scores && ranks) {
        var mythicPlusScore = '';
        var mythicPlusRanks = '';
        if(specRole === 'DPS'){
          mythicPlusScore = `**DPS Score:** ${scores.dps.toLocaleString()}\n`;
          mythicPlusRanks = `**${charClass.name} DPS Ranks:** \nRealm - ${ranks.class_dps.realm.toLocaleString()}\nRegion - ${ranks.class_dps.region.toLocaleString()}\nWorld - ${ranks.class_dps.world.toLocaleString()}\n`;
        } else
        if(specRole === 'HEALING') {
          mythicPlusScore = `**Healer Score:** ${scores.healer.toLocaleString()}\n`;
          mythicPlusRanks = `**${charClass.name} Healer Ranks:** \nRealm - ${ranks.class_healer.realm.toLocaleString()}\nRegion - ${ranks.class_dps.region.toLocaleString()}\nWorld - ${ranks.class_healer.world.toLocaleString()}\n`;
        } else
        if(specRole ==='TANK') {
          mythicPlusScore = `**Tank Score:** ${scores.tank.toLocaleString()}\n`;
          mythicPlusRanks = `**${charClass.name} Tank Ranks:** \nRealm - ${ranks.class_tank.realm.toLocaleString()}\nRegion - ${ranks.class_dps.region.toLocaleString()}\nWorld - ${ranks.class_tank.world.toLocaleString()}\n`;
        }
        mythicPlusSummary += mythicPlusScore + mythicPlusRanks;
      }

      var artifactTraits = '0';
      var progressionSummary = ``;
      if (responseRaiderIo.gear) {
        if (responseRaiderIo.gear.artifact_traits) {
          artifactTraits = responseRaiderIo.gear.artifact_traits;
        }
        var raidProgression = response.data.progression.raids;
        if (raidProgression) {
          for (var i = 0; i < progressionRaids.length; i++) {
            if (i != 0)
              progressionSummary += '\n';
            for (var j = 0; j < raidProgression.length; j++) {
              if (raidProgression[j].name == progressionRaids[i].name) {
                var bosses = raidProgression[j].bosses;
                var totalBosses = bosses.length;
                var normalBossesKilled = 0;
                var heroicBossesKilled = 0;
                var mythicBossesKilled = 0;
                for (var k = 0; k < totalBosses; k++) {
                  if (bosses[k].normalKills > 0)
                    normalBossesKilled++;
                  if (bosses[k].heroicKills > 0)
                    heroicBossesKilled++;
                  if (bosses[k].mythicKills > 0)
                    mythicBossesKilled++;
                }
                if (mythicBossesKilled > 0) {
                  progressionSummary += `**${progressionRaids[i].short}:** ${mythicBossesKilled}/${totalBosses} M`;
                }
                else if (heroicBossesKilled > 0) {
                  progressionSummary += `**${progressionRaids[i].short}:** ${heroicBossesKilled}/${totalBosses} H`;
                }
                else {
                  progressionSummary += `**${progressionRaids[i].short}:** ${normalBossesKilled}/${totalBosses} N`;
                }
              }
            }
            if (progressionRaids[i].short === 'EN') {
              if(achievementsCompleted.includes(ce.en)) {
                progressionSummary += ' \`CE\`';
              } else
              if (achievementsCompleted.includes(aotc.en)) {
                progressionSummary += ' \`AOTC\`';
              }
            } else
            if (progressionRaids[i].short === 'ToV') {
              if(achievementsCompleted.includes(ce.tov)) {
                progressionSummary += ' \`CE\`';
              } else
              if (achievementsCompleted.includes(aotc.tov)) {
                progressionSummary += ' \`AOTC\`';
              }
            } else
            if (progressionRaids[i].short === 'NH') {
              if(achievementsCompleted.includes(ce.nh)) {
                progressionSummary += ' \`CE\`';
              } else
              if (achievementsCompleted.includes(aotc.nh)) {
                progressionSummary += ' \`AOTC\`';
              }
            } else
            if (progressionRaids[i].short === 'ToS') {
              if(achievementsCompleted.includes(ce.tos)) {
                progressionSummary += ' \`CE\`';
              } else
              if (achievementsCompleted.includes(aotc.tos)) {
                progressionSummary += ' \`AOTC\`';
              }
            } else
            if (progressionRaids[i].short === 'ABT') {
              if(achievementsCompleted.includes(ce.abt)) {
                progressionSummary += ' \`CE\`';
              } else
              if (achievementsCompleted.includes(aotc.abt)) {
                progressionSummary += ' \`AOTC\`';
              }
            }

          }
        }
      }

      var charArmoryUrl = getArmoryUrl();
      var charRaiderIoUrl = util.format(raiderIoUrl, region, realm.replace(' ', '-'), character);
      var charLogsUrl = util.format(warcraftLogsUrl, region, realm.replace(' ', '-'), character);
      var charLinks = `[WarcraftLogs](${charLogsUrl}) | [Raider.IO](${charRaiderIoUrl})`;

      var charPvPUrl = charArmoryUrl + '/pvp';
      request(charPvPUrl, (err, res, body) => {
        if (err) {
          var owner = client.users.get(config.ownerID);
          message.channel.send(`Something's not quite right... Complain to ${owner}`);
          return console.log(err);
        }

        var honorLevel = 0;
        var prestigeLevel = 0;
        // Scrape Armory PVP page for honor and prestige levels
        var $ = cheerio.load(body);
        $('.font-semp-xSmall-white').each(function(i, elem) {
          if (i === 0) {
            prestigeLevel = $(this).text().replace('Level ', '');
          } else
          if (i === 1) {
            honorLevel = $(this).text().replace('Level ', '');
          }
        });

        var embedFields = [
          {
            name: 'Stats',
            value: `**${mainStat}:** ${mainStatValue.toLocaleString()} \n**Crit:** ${stats.crit.toFixed(2)}%\n**Haste:** ` +
            `${stats.haste.toFixed(2)}%\n**Mastery:** ${stats.mastery.toFixed(2)}%\n**Versatility:** ${versBonus.toFixed(2)}%\n`,
            inline: true
          },
          {
            name: 'PVP',
            value: `**Prestige Level:** ${prestigeLevel}\n**Honor Level:** ${honorLevel}\n**2v2 Rating:** ${pvpBrackets.ARENA_BRACKET_2v2.rating.toLocaleString()}\n` +
            `**3v3 Rating:** ${pvpBrackets.ARENA_BRACKET_3v3.rating.toLocaleString()}\n**Battleground Rating:** ` +
            `${pvpBrackets.ARENA_BRACKET_RBG.rating.toLocaleString()}\n**Honorable Kills:** ` +
            `${response.data.totalHonorableKills.toLocaleString()}\n`,
            inline: true
          },
          {
            name: 'Links',
            value: charLinks
          }
        ];
        if (charLevel === 110) {
          embedFields.splice(1, 0, {name: 'Raid Progression', value: progressionSummary, inline: true});
          embedFields.splice(3, 0, {name: 'Mythic+', value: mythicPlusSummary, inline: true});
        }
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
           fields: embedFields,
           footer: {
             icon_url: bilgewaterIconUrl,
             text: 'Character Data | Powered by Bilgewater Bot'
           }
         }});
      });
    }).catch(error => {
       winston.log('error', chalk.bgRed(`toon: ${error}\n ${error.stack}`));
       message.channel.send('\`\`\`Character not found. Check spelling and region.\`\`\`');
    });
  });
}

function buildCollectionsResponse(client, message, args) {
  blizzard.wow.character(['titles', 'mounts', 'pets'], { origin: region, realm: realm, name: character })
  .then(response => {
    var embedColor = getFactionEmbedColor(response.data.faction);
    var charName = getNameAndTitle(response.data);
    var collectedMounts = response.data.mounts.collected;
    var collectedPets = response.data.pets.collected;
    var randomCollected = '';
    var collectedSelector = getRandomIntInclusive(0, 1);
    if (collectedSelector === 0) {
        randomCollected = collectedMounts[getRandomIntInclusive(0, collectedMounts.length - 1)];
    }
    else {
      randomCollected = collectedPets[getRandomIntInclusive(0, collectedPets.length - 1)];
    }
    var collectionAuthorIconUrl = util.format(iconRenderUrl, region, iconSize, 'spell_nature_swiftness');
    var collectionIconUrl = util.format(iconRenderUrl, region, iconSize, randomCollected.icon);

    var charArmoryUrl = getArmoryUrl();
    var charCollectionUrl = charArmoryUrl + '/collections/mounts';

    var mountsCompletionBar = '';//'[';
    // var mountsCompletionPercentage = response.data.mounts.numCollected / (response.data.mounts.numCollected + response.data.mounts.numNotCollected);
    // for (var i = 1; i <= 20; i++) {
    //   if (mountsCompletionPercentage.toFixed(2) >= (.05 * i)) {
    //     mountsCompletionBar += '|';
    //   } else {
    //     mountsCompletionBar += '.';
    //   }
    // }
    // mountsCompletionBar += ']';

    var petsCompletionBar = '';//'[';
    // var petsCompletionPercentage = response.data.pets.numCollected / (response.data.pets.numCollected + response.data.pets.numNotCollected);
    // for (var i = 1; i <= 20; i++) {
    //   if (petsCompletionPercentage.toFixed(2) >= (.05 * i)) {
    //     petsCompletionBar += '|';
    //   } else {
    //     petsCompletionBar += '.';
    //   }
    // }
    //petsCompletionBar += ']';
    message.channel.send({embed: {
       color: embedColor,
       title: `${charName} @ ${response.data.realm}`,
       url: charCollectionUrl,
       author: {
         name: 'Collections',
         icon_url: collectionAuthorIconUrl
       },
       thumbnail: {
         url: collectionIconUrl
       },
       fields: [
         {
           name: 'Mounts',
           value: `${response.data.mounts.numCollected}/${response.data.mounts.numCollected + response.data.mounts.numNotCollected}\n${mountsCompletionBar}`,
           inline: true
         },
         {
           name: 'Pets',
           value: `${response.data.pets.numCollected}/${response.data.pets.numCollected + response.data.pets.numNotCollected}\n${petsCompletionBar}`,
           inline: true
         }
       ],
       footer: {
         icon_url: bilgewaterIconUrl,
         text: 'Collections Data | Powered by Bilgewater Bot'
       }
     }});
  }).catch(error => {
     winston.log('error', chalk.bgRed(`toon: ${error}\n ${error.stack}`));
     message.channel.send('\`\`\`Character not found. Check spelling and region.\`\`\`');
  });
}

function buildProfessionsResponse(client, message, args) {
  blizzard.wow.character(['titles', 'professions'], { origin: region, realm: realm, name: character })
  .then(response => {
    var professions = response.data.professions;

    var embedColor = getFactionEmbedColor(response.data.faction);
    var charName = getNameAndTitle(response.data);
    var professionsAuthorIconUrl = util.format(iconRenderUrl, region, iconSize, 'inv_pick_02');
    var professionsIconUrl = 'inv_pick_02';
    var primaryProfessionsSummary = '';
    var secondaryProfessionsSummary = '';
    if (professions.primary.length > 0) {
     professionsIconUrl =  util.format(iconRenderUrl, region, iconSize, professions.primary[0].icon);
     for (var i = 0; i < professions.primary.length; i++) {
       var profession = professions.primary[i];
       primaryProfessionsSummary += `**${profession.name}**\nRank: ${profession.rank}/${profession.max}`;
       if (profession.recipes.length > 0) {
         primaryProfessionsSummary += `\nRecipes Learned: ${profession.recipes.length}`;
       }
       primaryProfessionsSummary += '\n\n';
     }
    } else {
      primaryProfessionsSummary = 'No primary professions';
    }

    if (professions.secondary.length > 0) {
     for (var i = 0; i < professions.secondary.length; i++) {
       var profession = professions.secondary[i];
       if(profession.max === 0) {
         continue;
       }
       secondaryProfessionsSummary += `**${profession.name}**\nRank: ${profession.rank}/${profession.max}`;
       if (profession.recipes.length > 0) {
         secondaryProfessionsSummary += `\nRecipes Learned: ${profession.recipes.length}`;
       }
       secondaryProfessionsSummary += '\n\n';
     }
    } else {
      secondaryProfessionsSummary = 'No secondary professions';
    }

    var charArmoryUrl = getArmoryUrl();

    message.channel.send({embed: {
       color: embedColor,
       title: `${charName} @ ${response.data.realm}`,
       url: charArmoryUrl,
       author: {
         name: 'Professions',
         icon_url: professionsAuthorIconUrl
       },
       thumbnail: {
         url: professionsIconUrl
       },
       fields: [
         {
           name: 'Primary',
           value: primaryProfessionsSummary,
           inline: true
         },
         {
           name: 'Secondary',
           value: secondaryProfessionsSummary,
           inline: true
         }
       ],
       footer: {
         icon_url: bilgewaterIconUrl,
         text: 'Professions Data | Powered by Bilgewater Bot'
       }
     }});
  }).catch(error => {
     winston.log('error', chalk.bgRed(`toon: ${error}\n ${error.stack}`));
     message.channel.send('\`\`\`Character not found. Check spelling and region.\`\`\`');
  });
}

function buildAchievementsResponse(client, message, args) {
  blizzard.wow.character(['titles', 'achievements'], { origin: region, realm: realm, name: character })
  .then(response => {
    var achievements = response.data.achievements;
    var achievementsCompleted = achievements.achievementsCompleted;
    console.log(achievementsCompleted);

    var embedColor = getFactionEmbedColor(response.data.faction);
    var charName = getNameAndTitle(response.data);

    var charName = titleSelected.replace('%s', response.data.name);
    var achievementsAuthorIconUrl = util.format(iconRenderUrl, region, iconSize, 'inv_pick_02');
    var achievementsIconUrl = util.format(iconRenderUrl, region, iconSize, 'inv_pick_02');

    var charArmoryUrl = getArmoryUrl();

    message.channel.send({embed: {
       color: embedColor,
       title: `${charName} @ ${response.data.realm}`,
       url: charArmoryUrl,
       author: {
         name: 'Achievements',
         icon_url: achievementsAuthorIconUrl
       },
       thumbnail: {
         url: achievementsIconUrl
       },
       fields: [
         {
           name: 'Stuff',
           value: 'Things',
           inline: true
         }
       ],
       footer: {
         icon_url: bilgewaterIconUrl,
         text: 'Achievements Data | Powered by Bilgewater Bot'
       }
     }});
  }).catch(error => {
     winston.log('error', chalk.bgRed(`toon: ${error}\n ${error.stack}`));
     message.channel.send('\`\`\`Character not found. Check spelling and region.\`\`\`');
  });
}

function buildMythicPlusResponse(client, message, args) {
  var requestRaiderIo = util.format(requestRaiderIoUrl, region, realm, character);
  requestRaiderIo += detailedRaiderIo;
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

        var lastDungeonIconUrl = util.format(iconRenderUrl, region, iconSize, 'inv_relics_hourglass');
        var mythicPlusAuthorIconUrl = util.format(iconRenderUrl, region, iconSize, 'inv_relics_hourglass');
        var lastDungeonBannerUrl = '';

        for(i = 0; i < classes.length; i++) {
          if(classes[i].id == response.data.class) {
            charClass= classes[i];
            break;
          }
        }

        var embedColor = getFactionEmbedColor(response.data.faction);
        var charName = getNameAndTitle(response.data);

        var charArmoryUrl = getArmoryUrl();
        var charRaiderIoUrl = util.format(raiderIoUrl, region, realm.replace(' ', '-'), character);

        var achievementsCompleted = response.data.achievements.achievementsCompleted;
        var mythicPlusSummary = '';
        if (achievementsCompleted.includes(keystoneAchievements.master)) {
          mythicPlusSummary += '\`Keystone Master\`\n';
        } else
        if (achievementsCompleted.includes(keystoneAchievements.conqueror)) {
          mythicPlusSummary += '\`Keystone Conqueror\`\n';
        } else
        if (achievementsCompleted.includes(keystoneAchievements.challanger)) {
          mythicPlusSummary += '\`Keystone Challanger\`\n';
        } else
        if (achievementsCompleted.includes(keystoneAchievements.initiate)) {
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
        var lastRunReport = getMythicPlusReport(mpRecentRuns, false);

        var latestRun = mpRecentRuns[0];
        if (latestRun) {
          lastDungeonIconUrl = util.format(iconRenderUrl, region, iconSize, dungeonIcons[latestRun.short_name.toLowerCase()]);
          var dungeon = latestRun.dungeon.toLowerCase().replace(/ /g, '-').replace(/:/g, '');
          lastDungeonBannerUrl = util.format(dungeonBannerUrl, dungeon);
        }

        var mpWeeklyBests = responseRaiderIo.mythic_plus_weekly_highest_level_runs;
        var weeklyBestReport = getMythicPlusReport(mpWeeklyBests, true);

        var mpSeasonScoreBests = responseRaiderIo.mythic_plus_best_runs;
        var seasonScoreBestReport = getMythicPlusReport(mpSeasonScoreBests, false);

        var mpSeasonLevelBests = responseRaiderIo.mythic_plus_highest_level_runs;
        var seasonLevelBestReport = getMythicPlusReport(mpSeasonLevelBests, false);


        message.channel.send({embed: {
           color: embedColor,
           title: `${charName} @ ${response.data.realm}`,
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
             icon_url: bilgewaterIconUrl,
             text: 'Mythic+ Performance Data | Powered by Raider.IO'
           }
         }});
      }).catch(error => {
         winston.log('error', chalk.bgRed(`toon: ${error}\n ${error.stack}`));
         message.channel.send('\`\`\`Character not found. Check spelling and region.\`\`\`');
      });
    });
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

function getFactionEmbedColor (faction) {
  var embedColor = 0x004fce; // Blue for Alliance
  if(faction == 1) {
    embedColor = 0xad0505; // Red for Horde
  }
  return embedColor
}

function getNameAndTitle(data) {
  var titles = data.titles;
  var titleSelected = '%s';
  for(i = 0; i < titles.length; i++) {
    if(titles[i].selected) {
      titleSelected = titles[i].name;
      break;
    }
  }
  var name = titleSelected.replace('%s', data.name);
  return name;
}

function getArmoryUrl() {
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
  return util.format(armoryUrl, armoryRegion, realm.replace(' ', '-'), character);
}

function getMythicPlusReport(runs, weeklyReport) {
  var runReport;
  if(runs === undefined || runs.length == 0) {
    if (weeklyReport) {
      runReport = 'No Mythic+ dungeons \ncompleted this week.';
    } else {
      runReport = 'No Mythic+ dungeons \ncompleted this season.';
    }
  } else {
    var run = runs[0];
    var runTime = msToTime(run.clear_time_ms);
    runResult = upgradesToResult(run.num_keystone_upgrades);
    runReport = `[+${run.mythic_level} ${run.dungeon}](${run.url})\nTime: ` +
    `${runTime}\nResult: ${runResult}\nScore: ${run.score}`;
  }
  return runReport;
}

function sendUsageResponse(message) {
  var usage = `\`\`\`Usage: \n\n${config.prefix}toon <character> <realm>\n-----------OR-----------\n${config.prefix}` +
    `toon <bookmark>\n\nOptional Arguments:\n\n-r <region>       Specify the character's region. Valid regions are us(*), eu, kr, and tw\n` +
    `-m, -mythicplus   Display mythic+ dungeon statistics for the character\n` +
    `-c, -collections  Display collection statistics for the character\n` +
    `-p, -professions  Display professions statistics for the character\n` +
    `\n(*) = Default Value\n\nAdditional Info:\n\nMythic+ data is usually updated ` +
    `within the hour.\nAll other data is updated on logout.\`\`\``;
    message.channel.send(usage);
    return;
}

function msToTime(duration) {
  var seconds = parseInt((duration/1000)%60);
  var minutes = parseInt((duration/(1000*60))%60);

  seconds = (seconds < 10) ? '0' + seconds : seconds;

  return minutes + 'm ' + seconds + 's';
}

function getRandomIntInclusive(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
}
