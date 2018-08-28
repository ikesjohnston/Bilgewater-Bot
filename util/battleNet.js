const config = require('../config.json');
const blizzard = require('blizzard.js').initialize({ apikey: config.battlenet });
const util = require('util');
const request = require('request');
const cheerio = require('cheerio');
const common = require('..//util//common');
const logging = require('..//util//logging');
const raiderIo = require('..//util//raiderIo');
const warcraftLogs = require('..//util//warcraftLogs');

const armoryUrl = 'https://worldofwarcraft.com/%s/character/%s/%s';
const charRenderUrl = 'https://render-%s.worldofwarcraft.com/character/%s';
const iconRenderUrl = 'https://render-%s.worldofwarcraft.com/icons/%d/%s.jpg';

const wowheadItemUrl = 'http://www.wowhead.com/item=%s';
const wowheadAchievementUrl = 'http://www.wowhead.com/achievement=%s';

const battleNetIconUrl = 'https://i.imgur.com/61ceiuH.png'

const iconSize = 56;
const validRegions = ['us', 'eu', 'kr', 'tw'];
const activitiesToDisplay = 10;

// Legion raids
const progressionRaids = [
  {'name': 'The Emerald Nightmare', 'short': 'EN'},
  {'name': 'Trial of Valor', 'short': 'ToV'},
  {'name': 'The Nighthold', 'short': 'NH'},
  {'name': 'Tomb of Sargeras', 'short': 'ToS'},
  {'name': 'Antorus, the Burning Throne', 'short': 'ABT'},
  {'name': 'Uldir', 'short': 'Uld'}
];

// 'Ahead of the Curve' achievement IDs
const aotc = {
  'en': 11194,
  'tov': 11581,
  'nh': 11195,
  'tos': 11874,
  'abt': 12110,
  'uld': 12536
};

// 'Cutting Edge' achievement IDs
const ce = {
  'en': 11191,
  'tov': 11580,
  'nh': 11192,
  'tos': 11875,
  'abt': 12111,
  'uld': 12535
};

//Hex colors for Horde and Alliance
const HordeColor = 0xad0505;
const AllianceColor = 0x004fce;

// Hex color codes for item embeds
const itemQualityColors = {
  0: 0x9d9d9d,
  1: 0xffffff,
  2: 0x1eff00,
  3: 0x0070dd,
  4: 0xa335ee,
  5: 0xff8000,
  6: 0xe6cc80,
  7: 0x00ccff,
  8: 0x00ccff
};

/**
 * Verifies that the given region is valid for API requests
 * @param {String} region The input region 
 * @param {Message} message The message sent in chat from the user
 */
exports.isValidRegion = function(region, message) {
  for (var i = 0; i < validRegions.length; i++) {
    if (validRegions[i].toLowerCase() == region.toLowerCase())
      return true;
  }
  var errorMessage = `invalid region! Valid regions are us, eu, kr, and tw.`;
  message.reply(errorMessage);
  return false;
}

/**
 * Returns a working WoW Armory URL for the given character
 * @param {String} character The character's name
 * @param {String} realm The character's realm name
 * @param {String} region The character's region
 */
exports.getArmoryUrl = function(character, realm, region) {
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
  var url = util.format(armoryUrl, armoryRegion, realm.replace(' ', '-').replace('\'', ''), character);
  return url;
}

/**
 * Returns the formatted url for the item/spell/achievement's icon render
 * @param {String} region The battle.net region to make this render request for (generally the same region as the character)
 * @param {String} icon The name of the item/spell/achievement icon
 */
exports.getIconRenderUrl = function(region, icon) {
  var renderUrl = util.format(iconRenderUrl, region, iconSize, icon)
  return renderUrl;
}

/**
 * Returns the formatted url for the character's image render
 * @param {String} region The battle.net region to make this render request for (generally the same region as the character)
 * @param {String} imageUrl The url fragment that refers to the desired character (retrieved from character request)
 */
exports.getCharRenderUrl = function(region, imageUrl) {
  var renderUrl = util.format(charRenderUrl, region, imageUrl)
  return renderUrl;
}

/**
 * Returns the formatted name and title (if one exists) for a character
 * @param {Object} data The character response data from battle.net
 */
exports.getNameAndTitle = function (data) {
  if(data && data.titles) {
    var titles = data.titles;
    var titleSelected = '%s';
    for(i = 0; i < titles.length; i++) {
      if(titles[i].selected) {
        titleSelected = titles[i].name;
        break;
      }
    }
    var nameAndTitle = titleSelected.replace('%s', data.name);
    return nameAndTitle;
  }

  return '';
}

/**
 * Returns the hex color code for the given faction
 * @param {Number} faction 
 */
exports.getFactionEmbedColor = function (faction) {
  var embedColor = AllianceColor; // Blue for Alliance
  if(faction == 1) {
    embedColor = HordeColor; // Red for Horde
  }
  return embedColor
}

/**
 * Sends a discord response with a general character overview
 * @param {String} character The character's name
 * @param {String} realm The character's realm name
 * @param {String} region The character's region 
 * @param {Message} message The message to reply to; sent from the user in chat
 */
exports.sendCharacterResponse = function (character, realm, region, message) {
  // Send an initial response so the user knows the bot is working
  message.channel.send("Fetching character data for you...")
  .then( sanityMessage => {
    // Make request to raider.io
    var requestRaiderIo = raiderIo.getRequestUrl(character, realm, region);
    request(requestRaiderIo, { json: true }, (err, res, body) => {
      if (err) {
        var owner = client.users.get(config.ownerID);
        message.channel.send(`Something's not quite right with Raider.IO... Complain to ${owner}`);

        logging.toonLogger.log({
          level: 'Error',
          message: `(battleNet.js:sendCharacterResponse) Request to Raider.IO failed for ${character} ${realm} ${region}: ${err}`
        });
        common.stopDebugTimer(`toonRequest${message.author.id}`);
        return;
      }

      var responseRaiderIo = res.body;

      var races = undefined;
      var classes = undefined;

      // Make battle.net wow data request for race data
      blizzard.wow.data('character-races', { origin: region })
      .then(response => {
        races = response.data.races;

        // Make battle.net wow data request for class data
        blizzard.wow.data('character-classes', { origin: region })
        .then(response => {
          classes = response.data.classes;
  
            // Make battle.net wow character request for character data
            blizzard.wow.character(['profile', 'stats', 'items', 'talents', 'pvp', 'titles', 'achievements', 'progression'], 
            { origin: region, realm: realm, name: character })
            .then(response => {
  
              // Build link URLs
              var charArmoryUrl = exports.getArmoryUrl(character, realm, region);
              var charRaiderIoUrl = raiderIo.getCharacterUrl(character, realm, region);
              var charLogsUrl = warcraftLogs.getCharacterUrl(character, realm, region);
              var charLinks = `[Armory](${charArmoryUrl}) | [WarcraftLogs](${charLogsUrl}) | [Raider.IO](${charRaiderIoUrl})`;
              
              // Begin processing general stats ------------------------------------------------------------------------------------------------
              var characterImageUrlThumbnail = exports.getCharRenderUrl(region, response.data.thumbnail);
              var characterImageUrlMain = characterImageUrlThumbnail.replace('avatar', 'mainBookmark');
              var characterImageUrlInset = characterImageUrlThumbnail.replace('avatar', 'inset');
  
              var charLevel = response.data.level;
              var azeriteLevel = -1;
              
              var charRace = '';
              for(i = 0; i < races.length; i++) {
                if(races[i].id == response.data.race) {
                  charRace = races[i];
                  break;
                }
              }
  
              var charClass = '';
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
  
              var embedColor = exports.getFactionEmbedColor(response.data.faction);
              var characterNameTitle = exports.getNameAndTitle(response.data);
  
              var talents = response.data.talents;
              var currentSpec;
              for(i = 0; i < talents.length; i++) {
                if(talents[i].selected) {
                  currentSpec = talents[i];
                  break;
                }
              }
  
              var specRole = currentSpec.spec.role;
              var specIconUrl = exports.getIconRenderUrl(region, currentSpec.spec.icon);
  
              // Get specific versatility bonus based on current spec
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
  
              // Set chracter's main stat to whichever is the highest
              var mainBookmarkStat = 'Intellect';
              var mainBookmarkStatValue = stats.int;
              if(stats.agi > mainBookmarkStatValue) {
                mainBookmarkStat = 'Agility';
                mainBookmarkStatValue = stats.agi;
              }
              if(stats.str > mainBookmarkStatValue) {
                mainBookmarkStat = 'Strength';
                mainBookmarkStatValue = stats.str;
              }

              // Get azerite level
              var neck = items.neck;
              if(neck && neck.name === 'Heart of Azeroth') {
                azeriteLevel = neck.azeriteItem.azeriteLevel;
              }

              // End processing general stats --------------------------------------------------------------------------------------------------
  
              // Begin processing mythic+ scores and ranks -------------------------------------------------------------------------------------
              var mythicPlusSummary = '';
  
              // Add achievement badge
              if (achievementsCompleted.includes(raiderIo.keystoneAchievements.master)) {
                mythicPlusSummary += '\`Keystone Master\`\n';
              } else
              if (achievementsCompleted.includes(raiderIo.keystoneAchievements.conqueror)) {
                mythicPlusSummary += '\`Keystone Conqueror\`\n';
              } else
              if (achievementsCompleted.includes(raiderIo.keystoneAchievements.challanger)) {
                mythicPlusSummary += '\`Keystone Challanger\`\n';
              } else
              if (achievementsCompleted.includes(raiderIo.keystoneAchievements.initiate)) {
                mythicPlusSummary += '\`Keystone Initiate\`\n';
              }
  
              var scores = responseRaiderIo.mythic_plus_scores;
              var ranks = responseRaiderIo.mythic_plus_ranks;
  
              // Get ranks based on current spec
              if(scores && ranks) {
                var mythicPlusScore = '';
                var mythicPlusRanks = '';
                if(specRole === 'DPS'){
                  mythicPlusScore = `**DPS Score:** ${scores.dps.toLocaleString()}\n`;
                  mythicPlusRanks = `**${charClass.name} DPS Ranks:** \nRealm - ${ranks.class_dps.realm.toLocaleString()}\nRegion - ` + 
                  `${ranks.class_dps.region.toLocaleString()}\nWorld - ${ranks.class_dps.world.toLocaleString()}\n`;
                } else
                if(specRole === 'HEALING') {
                  mythicPlusScore = `**Healer Score:** ${scores.healer.toLocaleString()}\n`;
                  mythicPlusRanks = `**${charClass.name} Healer Ranks:** \nRealm - ${ranks.class_healer.realm.toLocaleString()}\nRegion - ` + 
                  `${ranks.class_dps.region.toLocaleString()}\nWorld - ${ranks.class_healer.world.toLocaleString()}\n`;
                } else
                if(specRole ==='TANK') {
                  mythicPlusScore = `**Tank Score:** ${scores.tank.toLocaleString()}\n`;
                  mythicPlusRanks = `**${charClass.name} Tank Ranks:** \nRealm - ${ranks.class_tank.realm.toLocaleString()}\nRegion - ` + 
                  `${ranks.class_dps.region.toLocaleString()}\nWorld - ${ranks.class_tank.world.toLocaleString()}\n`;
                }
                mythicPlusSummary += mythicPlusScore + mythicPlusRanks;
              }
              else {
                mythicPlusSummary += `This character hasn\'t completed any Mythic+ dungeons`
              }
              // End processing mythic+ scores and ranks ---------------------------------------------------------------------------------------
  
              // Begin processing raid progression ---------------------------------------------------------------------------------------------
              var progressionSummary = ``;
              if (responseRaiderIo.gear) {
                var raidProgression = response.data.progression.raids;
                if (raidProgression) {
                  for (var i = 0; i < progressionRaids.length; i++) {
                    if (i != 0)
                      progressionSummary += '\n';
                    for (var j = 0; j < raidProgression.length; j++) {
                      if (raidProgression[j].name == progressionRaids[i].name) {
                        var bosses = raidProgression[j].bosses;
                        var totalBosses = bosses.length;
                        var lfrBossesKilled = 0;
                        var normalBossesKilled = 0;
                        var heroicBossesKilled = 0;
                        var mythicBossesKilled = 0;
                        for (var k = 0; k < totalBosses; k++) {
                          if (bosses[k].lfrKills > 0)
                            lfrBossesKilled++;
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
                        else if (normalBossesKilled > 0) {
                          progressionSummary += `**${progressionRaids[i].short}:** ${normalBossesKilled}/${totalBosses} N`;
                        }
                        else {
                          progressionSummary += `**${progressionRaids[i].short}:** ${lfrBossesKilled}/${totalBosses} LFR`;
                        }
                      }
                    }
  
                    // Add achievement badges
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
                else {
                  progressionSummary += 'This character hasn\'t completed any raids this expansion';
                }
              }
              // End processing raid progression -----------------------------------------------------------------------------------------------
  
              // Begin processing PVP stats ----------------------------------------------------------------------------------------------------
              // Scrape Armory PVP page for honor level; not accessible from battle.net API for some reason
              var charPvPUrl = charArmoryUrl + '/pvp';
              request(charPvPUrl, (err, res, body) => {
                if (err) {
                  var owner = client.users.get(config.ownerID);
                  message.channel.send(`Something's not quite right with PVP scraping... Complain to ${owner}`);
  
                  logging.toonLogger.log({
                    level: 'Error',
                    message: `(battleNet.js:sendCharacterResponse) Request to Armory PVP site failed for ${character} ${realm} ${region}: ${err}`
                  });
                  common.stopDebugTimer(`toonRequest${message.author.id}`);
                  return console.log(err);
                }
  
                var honorLevel = 0;
                var $ = cheerio.load(body);
                $('.font-semp-xSmall-white').each(function(i, elem) {
                  if (i === 0) {
                    honorLevel = $(this).text().replace('Level ', '');
                  }
                });
                // End processing PVP stats ----------------------------------------------------------------------------------------------------
  
                // Begin building embed fields for response ------------------------------------------------------------------------------------
                var description = '';
                console.log(azeriteLevel);
                if(azeriteLevel >= 0) {
                  description += `**Azerite Level:** ${azeriteLevel}\n`;
                }
                description += `**Average ILVL:** ${items.averageItemLevelEquipped.toLocaleString()}\n` +
                `**Achievement Points:** ${response.data.achievementPoints.toLocaleString()}\n`;

                var embedFields = [
                  {
                    name: 'Stats',
                    value: `**${mainBookmarkStat}:** ${mainBookmarkStatValue.toLocaleString()} \n**Crit:** ${stats.crit.toFixed(2)}%\n**Haste:** ` +
                    `${stats.haste.toFixed(2)}%\n**Mastery:** ${stats.mastery.toFixed(2)}%\n**Versatility:** ${versBonus.toFixed(2)}%\n`,
                    inline: true
                  }
                ];
  
                var fieldPVP = {
                  name: 'PVP',
                  value: `**Honor Level:** ${honorLevel}\n**2v2 Rating:** ${pvpBrackets.ARENA_BRACKET_2v2.rating.toLocaleString()}\n` +
                  `**3v3 Rating:** ${pvpBrackets.ARENA_BRACKET_3v3.rating.toLocaleString()}\n**Battleground Rating:** ` +
                  `${pvpBrackets.ARENA_BRACKET_RBG.rating.toLocaleString()}\n**Honorable Kills:** ` +
                  `${response.data.totalHonorableKills.toLocaleString()}\n`,
                  inline: true
                };
  
                var fieldLinks = {
                  name: 'Links',
                  value: charLinks
                };
  
                if (charLevel === 110 && progressionSummary != '') {
                  embedFields.push({name: 'Raid Progression', value: progressionSummary, inline: true});
                }
                embedFields.push(fieldPVP);
                if (charLevel === 110 && mythicPlusSummary != '') {
                  embedFields.push({name: 'Mythic+', value: mythicPlusSummary, inline: true});
                }
                embedFields.push(fieldLinks);
                // End building embed fields for response --------------------------------------------------------------------------------------
  
                // Remove sanity message and send response
                sanityMessage.delete();
                message.reply('here\'s what I found:')
                message.channel.send({embed: {
                  color: embedColor,
                  title: `Level ${charLevel} ${charRace.name} ${currentSpec.spec.name} ${charClass.name}\n`,
                  url: charArmoryUrl,
                  description: description,
                  author: {
                    name: `${characterNameTitle} @ ${response.data.realm}`,
                    icon_url: specIconUrl
                  },
                  thumbnail: {
                    url: characterImageUrlThumbnail
                  },
                  fields: embedFields,
                  footer: {
                    icon_url: battleNetIconUrl,
                    text: 'Character Data via Battle.net'
                  }
                }});
                common.stopDebugTimer(`toonRequest${message.author.id}`);
              });
            }).catch(error => {
              message.channel.send('\`\`\`Character not found. Check spelling and region.\`\`\`');
  
              logging.toonLogger.log({
                level: 'Error',
                message: `(battleNet.js:sendCharacterResponse) Character request to Battle.net failed for ${character} ${realm} ${region}\n${error.stack}`
              });
            });   
        }).catch(error => {
            message.channel.send(`Something's not quite right with WoW character data... Complain to ${owner}`);

            logging.toonLogger.log({
              level: 'Error',
              message: `(battleNet.js:sendCharacterResponse) Character data request to Battle.net failed for ${region}\n${error.stack}`
            });
        });
      }).catch(error => {
        message.channel.send(`Something's not quite right with WoW race data... Complain to ${owner}`);

        logging.toonLogger.log({
          level: 'Error',
          message: `(battleNet.js:sendCharacterResponse) Character race request to Battle.net failed for ${region}\n${error.stack}`
        });
      });    
    });
  });
}

/**
 * Sends a discord response with character mount & pet collection information
 * @param {String} character The character's name
 * @param {String} realm The character's realm name
 * @param {String} region The character's region 
 * @param {Message} message The message to reply to; sent from the user in chat
 */
exports.sendCollectionsResponse = function (character, realm, region, message) {
  // Send an initial response so the user knows the bot is working
  message.channel.send("Fetching collection data for you...")
  .then( sanityMessage => {
    // Make request to battle.net
    blizzard.wow.character(['titles', 'mounts', 'pets'], { origin: region, realm: realm, name: character })
    .then(response => {
      var characterNameTitle = exports.getNameAndTitle(response.data);

      var collectedMounts = response.data.mounts.collected;
      var collectedPets = response.data.pets.collected;

      // Get a 'random' pet or mount icon for the embed image
      var randomCollected = '';
      var collectedSelector = common.getRandomIntInclusive(0, 1);
      if (collectedSelector === 0) {
          randomCollected = collectedMounts[common.getRandomIntInclusive(0, collectedMounts.length - 1)];
      }
      else {
        randomCollected = collectedPets[common.getRandomIntInclusive(0, collectedPets.length - 1)];
      }

      var collectionAuthorIconUrl = exports.getIconRenderUrl(region, 'spell_nature_swiftness');
      var collectionIconUrl = exports.getIconRenderUrl(region, randomCollected.icon);

      var charArmoryUrl = exports.getArmoryUrl(character, realm, region);
      var charCollectionUrl = charArmoryUrl + '/collections/mounts';

      var embedColor = exports.getFactionEmbedColor(response.data.faction);
      var embedTitle = `${characterNameTitle} @ ${response.data.realm}`;
      var embedUrl = charCollectionUrl;
      var embedAuthor = {
        name: 'Collections',
        icon_url: collectionAuthorIconUrl
      };
      // Display the amount of mounts and pets the character has out of the total available
      var embedFields = [
        {
          name: 'Mounts',
          value: `${response.data.mounts.numCollected}/${response.data.mounts.numCollected + response.data.mounts.numNotCollected}`,
          inline: true
        },
        {
          name: 'Pets',
          value: `${response.data.pets.numCollected}/${response.data.pets.numCollected + response.data.pets.numNotCollected}`,
          inline: true
        }
      ];
      var embedThumbnail = {
        url: collectionIconUrl
      };
      var embedFooter = {
        icon_url: battleNetIconUrl,
        text: 'Collections Data via Battle.net'
      };

      var messageEmbed = common.buildEmbed(embedColor, embedTitle, embedUrl, embedAuthor, embedThumbnail, embedFields, embedFooter)

      // Remove sanity message and send response
      sanityMessage.delete();
      message.reply('here\'s what I found:')
      message.channel.send({embed: messageEmbed});

    }).catch(error => {
      message.channel.send('\`\`\`Character not found. Check spelling and region.\`\`\`');

      logging.toonLogger.log({
        level: 'Error',
        message: `(battleNet.js:buildCollectionsResponse) Character request to Battle.net failed for ${character} ${realm} ${region}\n${error.stack}`
      });
    });
  });
}

/**
 * Sends a discord response with character profession information
 * NOTE: With BFA, profession levels have been separated by expansion. This may result in a lot of 
 * unwantned data.
 * @param {String} character The character's name
 * @param {String} realm The character's realm name
 * @param {String} region The character's region 
 * @param {Message} message The message to reply to; sent from the user in chat
 */
exports.sendProfessionsResponse = function (character, realm, region, message) {
  // Send an initial response so the user knows the bot is working
  message.channel.send("Fetching character data for you...")
  .then( sanityMessage => {
    // Make request to battle.net
    blizzard.wow.character(['titles', 'professions'], { origin: region, realm: realm, name: character })
    .then(response => {
      var professions = response.data.professions;

      var professionsAuthorIconUrl = exports.getIconRenderUrl(region, 'inv_pick_02');

      // Begin processing profession data ------------------------------------------------------------------------------------------------------
      var primaryProfessionsSummary = '';
      var secondaryProfessionsSummary = '';
      professionsIconUrl =  exports.getIconRenderUrl(region, professions.primary[0].icon);

      var primaryNum = 0;
      for (var i = 0; i < professions.primary.length; i++) {
      var profession = professions.primary[i];
      // If no primary professions, skip processing
      if(profession.max === 0) {
        continue;
      }
      primaryNum++;
      var professionName = profession.name;
      // Profession name switch for BFA factions
      if(response.data.faction === 1) {
        professionName = professionName.replace('Kul Tiran', 'Zandalari');
      }

      primaryProfessionsSummary += `**${professionName}**\nRank: ${profession.rank}/${profession.max}`;
      if (profession.recipes.length > 0) {
        primaryProfessionsSummary += `\nRecipes Learned: ${profession.recipes.length}`;
      }
      primaryProfessionsSummary += '\n\n';
      }
      if (primaryNum === 0){
        primaryProfessionsSummary = 'None';
      }

      var secondaryNum = 0;
      for (var i = 0; i < professions.secondary.length; i++) {
        var profession = professions.secondary[i];
        // If no secondary professions, skip processing
        if(profession.max === 0) {
          continue;
        }
        secondaryNum++;
        professionName = profession.name;
        // Profession name switch for BFA factions
        if(response.data.faction === 1) {
          professionName = professionName.replace('Kul Tiran', 'Zandalari');
        }
        secondaryProfessionsSummary += `**${professionName}**\nRank: ${profession.rank}/${profession.max}`;
        if (profession.recipes.length > 0) {
          secondaryProfessionsSummary += `\nRecipes Learned: ${profession.recipes.length}`;
        }
        secondaryProfessionsSummary += '\n\n';
      }
      if (secondaryNum === 0){
        secondaryProfessionsSummary = 'None';
      }
      // End processing profession data --------------------------------------------------------------------------------------------------------

      var characterNameTitle = exports.getNameAndTitle(response.data);
      var charArmoryUrl = exports.getArmoryUrl(character, realm, region);

      var embedColor = exports.getFactionEmbedColor(response.data.faction);
      var embedTitle = `${characterNameTitle} @ ${response.data.realm}`;
      var embedUrl = charArmoryUrl;
      var embedAuthor = {
        name: 'Professions',
        icon_url: professionsAuthorIconUrl
      };
      var embedThumbnail = {
        url: professionsIconUrl
      };
      var embedFields =  [
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
      ];
      var embedFooter = {
        icon_url: battleNetIconUrl,
        text: 'Professions Data via Battle.Net'
      };

      var messageEmbed = common.buildEmbed(embedColor, embedTitle, embedUrl, embedAuthor, embedThumbnail, embedFields, embedFooter)

      // Remove sanity message and send response
      sanityMessage.delete();
      message.reply('here\'s what I found:')
      message.channel.send({embed: messageEmbed});

    }).catch(error => {
      message.channel.send('\`\`\`Character not found. Check spelling and region.\`\`\`');

      logging.toonLogger.log({
        level: 'Error',
        message: `(battleNet.js:buildProfessionsResponse) Character request to Battle.net failed for ${character} ${realm} ${region}\n${error.stack}`
      });
    });
  });
}

/**
 * Sends a series discord direct message responses detailing recent character activity
 * @param {String} character The character's name
 * @param {String} realm The character's realm name
 * @param {String} region The character's region 
 * @param {Message} message The message containing the autor to reply to; sent from the user in chat
 */
exports.sendFeedResponse = function (character, realm, region, message) {
  blizzard.wow.character(['titles', 'feed'], { origin: region, realm: realm, name: character })
  .then(response => {
    console.log(message.channel.type);
    if (message.channel.type != 'dm') {
      message.reply("sending activity feed to your DMs!");
    }
    var feed = response.data.feed;
    if(feed.length < activitiesToDisplay) {
      activitiesToDisplay = feed.length;
    }

    beginFeedDisplay(response, activitiesToDisplay, character, realm, region, message)

  }).catch(error => {
     message.channel.send('\`\`\`Character not found. Check spelling and region.\`\`\`');

     logging.toonLogger.log({
       level: 'Error',
       message: `(battleNet.js:buildFeedResponse) Character request to Battle.net failed for ${character} ${realm} ${region}\n${error.stack}`
     });
  });
}

/**
 * 
 * @param {*} response 
 * @param {*} activitiesToDisplay 
 * @param {*} character 
 * @param {*} realm 
 * @param {*} region 
 * @param {*} message 
 */
function beginFeedDisplay(response, activitiesToDisplay, character, realm, region, message) {
  message.author.send(`Displaying last ${activitiesToDisplay} activities...`);
  processActivity(response, 0, activitiesToDisplay, character, realm, region, message);
}

/**
 * 
 * @param {*} response 
 * @param {*} currentActivityIndex 
 * @param {*} activitiesToDisplay 
 * @param {*} character 
 * @param {*} realm 
 * @param {*} region 
 * @param {*} message 
 */
function processActivity(response, currentActivityIndex, activitiesToDisplay, character, realm, region, message) {
  var feed = response.data.feed;

  if(currentActivityIndex >= activitiesToDisplay) {
    endFeedDisplay(response, character, realm, region, message);
    return;
  }

  var characterImageUrlThumbnail = exports.getCharRenderUrl(region, response.data.thumbnail);
  var characterNameTitle = exports.getNameAndTitle(response.data);
  var charArmoryUrl = exports.getArmoryUrl(character, realm, region);

  var embedColor = null;
  var embedUrl = charArmoryUrl;
  var embedTitle = `Activity for ${characterNameTitle} @ ${response.data.realm}`;
  var embedFooter = {
    icon_url: battleNetIconUrl,
    text: 'Feed Data via Battle.net'
  };

  var activity = feed[currentActivityIndex];

  switch(activity.type) {
    case 'BOSSKILL':
      var activityAchievement = activity.achievement;
      var activityIconUrl = exports.getIconRenderUrl(region, activityAchievement.icon);

      var achievementDescription = activityAchievement.description;
      if(achievementDescription === '') {
        achievementDescription = activityAchievement.title;
      }

      var bossName = activity.name;
      // Some boss kill feed entries (looks to only be WOD and after) lack info
      if(bossName === '') {
        var bossNameEndIndex = activityAchievement.title.indexOf("kills") - 1;
        bossName = activityAchievement.title.substring(0, bossNameEndIndex);
      }

      var embedAuthor = {
        name: 'Boss Kill - ' + bossName,
        icon_url: characterImageUrlThumbnail
      };

      var embedThumbnail = {
        url: activityIconUrl
      };

      var embedFields =  [
        {
          name: 'Description',
          value: achievementDescription
        },
        {
          name: 'Date',
          value: common.msToDate(activity.timestamp)
        },
        {
          name: 'Quantity',
          value: activity.quantity
        }
      ];

      logging.toonLogger.log({
        level: 'Info',
        message: `(battleNet.js:sendFeedResponse) Sending BOSSKILL activity for ${character} ${realm} ${region}\n`
      });

      var messageEmbed = common.buildEmbed(embedColor, embedTitle, embedUrl, embedAuthor, embedThumbnail, embedFields, embedFooter)
      message.author.send({embed: messageEmbed});
      processActivity(response, currentActivityIndex + 1, activitiesToDisplay, character, realm, region, message);
      break;

    case 'LOOT':
      blizzard.wow.item({ id: activity.itemId, origin: region })
      .then(itemResponse => {
        var itemData = itemResponse.data;
        var itemIconUrl = exports.getIconRenderUrl(region, itemData.icon);

        var embedAuthor = {
          name: 'Looted - ' + itemData.name,
          icon_url: characterImageUrlThumbnail
        };

        var embedThumbnail = {
          url: itemIconUrl
        };

        embedColor = itemQualityColors[itemData.quality]
        var embedFields =  [];

        var statsDescription = `Item Level ${itemData.itemLevel}\n`;

        var itemSpells = itemData.itemSpells;
        if (itemSpells) {
          var spellDescriptions = '';
          for (var spellIndex = 0; spellIndex < itemSpells.length; spellIndex++) {
            var itemSpell = itemSpells[spellIndex];
            if (itemSpell.trigger === 'ON_EQUIP') {
              spellDescriptions += '\nEquip: ';
            }
            else {
              spellDescriptions += '\nUse: ';
            }
            spellDescriptions += `${itemSpell.spell.description}\n`;
          }
          statsDescription += spellDescriptions;
        }

        if(itemData.description)
        {
          var flavorText = `\n\"${itemData.description}\"\n`;
          statsDescription += flavorText;
        }

        var statsField = {
          name: 'Stats',
          value: statsDescription
        };
        embedFields.push(statsField);

        var itemUrl = util.format(wowheadItemUrl, itemData.id);
        var itemLinks = `[Wowhead](${itemUrl})`;

        var linksField = {
          name: 'Links',
          value: itemLinks
        };
        embedFields.push(linksField);

        var dateField = {
          name: 'Date',
          value: common.msToDate(activity.timestamp)
        };
        embedFields.push(dateField);

        logging.toonLogger.log({
          level: 'Info',
          message: `(battleNet.js:sendFeedResponse) Sending LOOT activity for ${character} ${realm} ${region}\n`
        });

        var messageEmbed = common.buildEmbed(embedColor, embedTitle, embedUrl, embedAuthor, embedThumbnail, embedFields, embedFooter)
        message.author.send({embed: messageEmbed});
        processActivity(response, currentActivityIndex + 1, activitiesToDisplay, character, realm, region, message);
      }).catch(error => {
         message.channel.send('\`\`\`Error processing LOOT activity.\`\`\`');

         logging.toonLogger.log({
           level: 'Error',
           message: `(battleNet.js:buildProfessionsResponse) Item request to Battle.net failed for ${activity.itemId} ${realm} ${region}\n${error.stack}`
         });
      });
      break;

    case 'ACHIEVEMENT':
      var activityAchievement = activity.achievement;
      var activityIconUrl = exports.getIconRenderUrl(region, activityAchievement.icon);
      var embedAuthor = {
        name: 'Unlocked Achievement - ' + activityAchievement.title,
        icon_url: characterImageUrlThumbnail
      };

      var embedThumbnail = {
        url: activityIconUrl
      };

      var achievementDescription = activityAchievement.description;
      if(activityAchievement.accountWide) {
        embedColor = 0x00ccff;
        achievementDescription += '\n\`Account Wide\`';
      }
      if(activity.featOfStrength) {
        embedColor = 0xe6cc80;
        achievementDescription += '\n\`Feat of Strength\`';
      }

      var embedFields =  [];

      var descriptionField = {
        name: 'Description',
        value: achievementDescription
      };
      embedFields.push(descriptionField);

      var achievementReward = activityAchievement.reward;
      if(achievementReward) {
        var rewardFormatted = achievementReward.replace(' Reward', '').replace('Reward: ', '');
        var rewardField = {
          name: 'Reward',
          value: rewardFormatted
        };
        embedFields.push(rewardField);
      }

      var achievementUrl = util.format(wowheadAchievementUrl, activityAchievement.id);
      var achievementLinks = `[Wowhead](${achievementUrl})`;

      var linksField = {
        name: 'Links',
        value: achievementLinks
      };
      embedFields.push(linksField);


      var dateField = {
        name: 'Date',
        value: common.msToDate(activity.timestamp)
      };
      embedFields.push(dateField);

      logging.toonLogger.log({
        level: 'Info',
        message: `(battleNet.js:sendFeedResponse) Sending ACHIEVEMENT activity for ${character} ${realm} ${region}\n`
      });

      var messageEmbed = common.buildEmbed(embedColor, embedTitle, embedUrl, embedAuthor, embedThumbnail, embedFields, embedFooter)
      message.author.send({embed: messageEmbed});
      processActivity(response, currentActivityIndex + 1, activitiesToDisplay, character, realm, region, message);
      break;

    case 'CRITERIA':
      var activityAchievement = activity.achievement;
      var activityIconUrl = exports.getIconRenderUrl(region, activityAchievement.icon);
      var embedAuthor = {
        name: 'Completed Criteria For - ' + activityAchievement.title,
        icon_url: characterImageUrlThumbnail
      };

      var embedThumbnail = {
        url: activityIconUrl
      };

      var achievementDescription = activityAchievement.description;
      if(activityAchievement.accountWide) {
        embedColor = 0x4286f4;
        achievementDescription += '\n\n\`Account Wide\`';
      }
      if(activity.featOfStrength) {
        embedColor = 0xdbb24a;
        achievementDescription += '\n\n\`Feat of Strength\`';
      }
      var achievementCriteria = activity.criteria.description;
      if(achievementCriteria === '') {
        achievementCriteria = achievementDescription;
      }
      var embedFields =  [
        {
          name: 'Description',
          value: achievementDescription
        },
        {
          name: 'Criteria',
          value: achievementCriteria
        },
        {
          name: 'Date',
          value: common.msToDate(activity.timestamp)
        }
      ];

      logging.toonLogger.log({
        level: 'Info',
        message: `(battleNet.js:sendFeedResponse) Sending CRITERIA activity for ${character} ${realm} ${region}\n`
      });

      var messageEmbed = common.buildEmbed(embedColor, embedTitle, embedUrl, embedAuthor, embedThumbnail, embedFields, embedFooter)
      message.author.send({embed: messageEmbed});
      processActivity(response, currentActivityIndex + 1, activitiesToDisplay, character, realm, region, message);
      break;

    default:
      message.author.send('Unknown activity type: ' + activity.type);
      processActivity(response, currentActivityIndex + 1, activitiesToDisplay, character, realm, region, message);
      break;
  }
}

/**
 * 
 * @param {*} response 
 * @param {*} character 
 * @param {*} realm 
 * @param {*} region 
 * @param {*} message 
 */
function endFeedDisplay(response, character, realm, region, message) {
  message.author.send(`End of feed.`);
}

/**
 * 
 * @param {*} character 
 * @param {*} realm 
 * @param {*} region 
 * @param {*} message 
 */
exports.sendAchievementsResponse = function (character, realm, region, message) {
  message.reply("fetching achievement data for you...");
  blizzard.wow.character(['titles', 'achievements'], { origin: region, realm: realm, name: character })
  .then(characterResponse => {
    var characterAchievements = characterResponse.data.achievements;
    var achievementsCompleted = characterAchievements.achievementsCompleted;
    var completedDictionary = {};
    for(var completedIndex = 0; completedIndex < achievementsCompleted.length; completedIndex++) {
      completedDictionary[achievementsCompleted[completedIndex]] = 1;
    }

    blizzard.wow.data('character-achievements', { origin: region })
    .then(response => {
      var achievements = response.data.achievements;
      var characterImageUrlThumbnail = exports.getCharRenderUrl(region, characterResponse.data.thumbnail);
      var achievementsThumbnailUrl = util.format(exports.iconRenderUrl, region, iconSize, 'achievement_dungeon_gloryoftheraider');

      var characterNameTitle = exports.getNameAndTitle(characterResponse.data);
      var charArmoryUrl = exports.getArmoryUrl(character, realm, region);

      var embedColor = exports.getFactionEmbedColor(characterResponse.data.faction);
      var embedTitle = `${characterNameTitle} @ ${characterResponse.data.realm}`;
      var embedUrl = charArmoryUrl;
      var embedAuthor = {
        name: 'Achievements',
        icon_url: characterImageUrlThumbnail
      };
      var embedThumbnail = {
        url: achievementsThumbnailUrl
      };

      var embedFields =  [];
      for(var categoryIndex = 0; categoryIndex < achievements.length; categoryIndex++) {
        var categoryAchieved = 0;
        var categoryTotal = 0;
        var achievementCategory = achievements[categoryIndex];
        var categoryAchievements = achievementCategory.achievements;
        for(var categoryAchievementIndex = 0; categoryAchievementIndex < categoryAchievements.length; categoryAchievementIndex++) {
          var categoryAchievement = categoryAchievements[categoryAchievementIndex];
          if(completedDictionary[categoryAchievement.id] === 1)
            categoryAchieved++;
          categoryTotal++;

          var achievementSubcategories = achievementCategory.categories;
          if( achievementSubcategories ) {
            for(var subcategoryIndex = 0; subcategoryIndex < achievementSubcategories.length; subcategoryIndex++) {
              achievementSubcategory = achievementSubcategories[subcategoryIndex];
              subcategoryAchievements = achievementSubcategory.achievements;
              for(var subcategoryAchievementIndex = 0; subcategoryAchievementIndex < subcategoryAchievements.length; subcategoryAchievementIndex++) {
                var subcategoryAchievement = subcategoryAchievements[subcategoryAchievementIndex];
                if(completedDictionary[subcategoryAchievement.id] === 1)
                  categoryAchieved++;
                categoryTotal++;
              }
            }
          }
        }
        var categoryField = {
          name: achievementCategory.name,
          value: `${categoryAchieved} / ${categoryTotal}`,
          inline: true
        }
        embedFields.push(categoryField);
      }

      var embedFooter = {
        icon_url: battleNetIconUrl,
        text: 'Achievements Data via Battle.net'
      };

      var messageEmbed = common.buildEmbed(embedColor, embedTitle, embedUrl, embedAuthor, embedThumbnail, embedFields, embedFooter)

      message.channel.send({embed: messageEmbed});
    }).catch(error => {
       message.channel.send('\`\`\`Error getting achievement data.\`\`\`');

       logging.toonLogger.log({
         level: 'Error',
         message: `(battleNet.js:buildAchievementsResponse) Achievement data request to Battle.net failed for ${character} ${realm} ${region}\n${error.stack}`
       });
     });
  }).catch(error => {
     message.channel.send('\`\`\`Error getting character achievement data.\`\`\`');

     logging.toonLogger.log({
       level: 'Error',
       message: `(battleNet.js:buildAchievementsResponse) Character achievement data request to Battle.net failed for ${character} ${realm} ${region}\n${error.stack}`
     });
  });
}
