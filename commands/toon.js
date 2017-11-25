const config = require('../config.json');
const winston = require('winston');
const chalk = require('chalk');
const blizzard = require('blizzard.js').initialize({ apikey: config.battlenet });
const util = require('util');
const request = require('request');

const bilgewater_icon_url = 'https://i.imgur.com/zjBxppj.png';
const char_render_url = 'https://render-%s.worldofwarcraft.com/character/%s';
const icon_render_url = 'https://render-%s.worldofwarcraft.com/icons/%d/%s.jpg';

const icon_size = 56;

const request_raiderio = 'https://raider.io/api/v1/characters/profile?region=%s&realm=%s&name=%s&fields=mythic_plus_weekly_highest_level_runs';

var character_name;
var realm_name;
var region_name;

exports.run = function(client, message, args) {
  if(args.length != 3) {
    message.channel.send(`Usage: \n\n${config.prefix}toon <character> <realm> <region> \n\nValid regions are us, eu, kr, and tw.`);
    return;
  }

  character_name = args[0];
  realm_name = args[1];
  region_name = args[2];

  var request_raiderio_char = util.format(request_raiderio, region_name, realm_name, character_name);
  request(request_raiderio_char, { json: true }, (err, res, body) => {
    if (err) {
      var owner = client.users.get(config.ownerID);
      message.channel.send(`Something's not quite right... Complain to ${owner}`);
      return console.log(err);
    }

    var response_raiderio = res.body;
    buildResponse(client, message, args, response_raiderio);
  });
};

function buildResponse(client, message, args, response_raiderio)
{
  var races;
  blizzard.wow.data('character-races', { origin: region_name })
  .then(response => {
    races = response.data.races;
  });

  var classes;
  blizzard.wow.data('character-classes', { origin: region_name })
  .then(response => {
    classes = response.data.classes;
  });

  blizzard.wow.character(['profile', 'stats', 'talents', 'items', 'progression', 'pvp', 'titles'], { origin: region_name, realm: realm_name, name: character_name })
  .then(response => {
    var char_url_thumbnail = util.format(char_render_url, region_name, response.data.thumbnail);
    var char_url_main = char_url_thumbnail.replace('avatar', 'main');

    // Blue embed color for alliance, red for horde
    var embed_color = 0x004fce;
    if(response.data.faction == 1) {
      embed_color = 0xad0505;
    }

    var raids = response.data.progression.raids;

    var raid_0 = raids[raids.length - 1];
    var raid_0_kills_lfr = 0;
    var raid_0_kills_n = 0;
    var raid_0_kills_h = 0;
    var raid_0_kills_m = 0;
    var bosses = raid_0.bosses;

    for(i = 0; i < bosses.length; i++) {
      if(bosses[i].lfrKills > 0) {
         raid_0_kills_lfr++;
      }
      if(bosses[i].normalKills > 0) {
         raid_0_kills_n++;
      }
      if(bosses[i].heroicKills > 0) {
         raid_0_kills_h++;
      }
      if(bosses[i].mythicKills > 0) {
         raid_0_kills_m++;
      }
    }

    var raid_1 = raids[raids.length - 2];
    var raid_1_kills_lfr = 0;
    var raid_1_kills_n = 0;
    var raid_1_kills_h = 0;
    var raid_1_kills_m = 0;
    bosses = raid_1.bosses;

    for(i = 0; i < bosses.length; i++) {
      if(bosses[i].lfrKills > 0) {
         raid_1_kills_lfr++;
      }
      if(bosses[i].normalKills > 0) {
         raid_1_kills_n++;
      }
      if(bosses[i].heroicKills > 0) {
         raid_1_kills_h++;
      }
      if(bosses[i].mythicKills > 0) {
         raid_1_kills_m++;
      }
    }

    var raid_2 = raids[raids.length - 3];
    var raid_2_kills_lfr = 0;
    var raid_2_kills_n = 0;
    var raid_2_kills_h = 0;
    var raid_2_kills_m = 0;
    bosses = raid_2.bosses;

    for(i = 0; i < bosses.length; i++) {
      if(bosses[i].lfrKills > 0) {
         raid_2_kills_lfr++;
      }
      if(bosses[i].normalKills > 0) {
         raid_2_kills_n++;
      }
      if(bosses[i].heroicKills > 0) {
         raid_2_kills_h++;
      }
      if(bosses[i].mythicKills > 0) {
         raid_2_kills_m++;
      }
    }

    var char_level = response.data.level;

    var char_race;
    for(i = 0; i < races.length; i++)
    {
      if(races[i].id == response.data.race)
      {
        char_race = races[i];
        break;
      }
    }

    var char_class;
    for(i = 0; i < classes.length; i++)
    {
      if(classes[i].id == response.data.class)
      {
        char_class= classes[i];
        break;
      }
    }

    var stats = response.data.stats;
    var power_name = stats.powerType;
    var power_name_cap = power_name[0].toUpperCase() + power_name.slice(1);

    var items = response.data.items;

    var pvp_brackets = response.data.pvp.brackets;

    var titles = response.data.titles;
    var title_selected = '%s';
    for(i = 0; i < titles.length; i++)
    {
      if(titles[i].selected)
      {
        title_selected = titles[i].name;
        break;
      }
    }

    var char_name = title_selected.replace("%s", response.data.name);

    var talents = response.data.talents;
    var current_spec;
    for(i = 0; i < talents.length; i++)
    {
      if(talents[i].selected)
      {
        current_spec = talents[i];
        break;
      }
    }

    var spec_role = current_spec.spec.role;
    var spec_icon_url = util.format(icon_render_url, region_name, icon_size, current_spec.spec.icon);

    var main_stat = "Intellect";
    var main_stat_value = stats.int;

    if(stats.agi > main_stat_value)
    {
      main_stat = "Agility";
      main_stat_value = stats.agi;
    }

    if(stats.str > main_stat_value)
    {
      main_stat = "Strength";
      main_stat_value = stats.str;
    }

    var vers_bonus;
    if(spec_role == "DPS")
    {
      vers_bonus = stats.versatilityDamageDoneBonus;
    }
    else if(spec_role == "HEALING")
    {
      vers_bonus = stats.versatilityHealingDoneBonus;
    }
    else if(spec_role == "TANK")
    {
      vers_bonus = stats.versatilityDamageTakenBonus;
    }

    var mp_weekly_bests = response_raiderio.mythic_plus_weekly_highest_level_runs;
    var weekly_best_report;
    if(mp_weekly_bests.length == 0)
    {
      weekly_best_report = 'No Mythic+ dungeons \ncompleted this week.';
    }
    else {
      var weekly_best = mp_weekly_bests[0];
      var weekly_best_time = msToTime(weekly_best.clear_time_ms);
      weekly_best_result = upgradesToResult(weekly_best.num_keystone_upgrades);
      weekly_best_report = `[+${weekly_best.mythic_level} ${weekly_best.dungeon}](${weekly_best.url})\nTime: ${weekly_best_time}\nResult: ${weekly_best_result}\nScore: ${weekly_best.score}`;
    }
    message.channel.send({embed: {
       color: embed_color,
       title: `Level ${char_level} ${char_race.name} ${current_spec.spec.name} ${char_class.name}\n`,
       url: `https://worldofwarcraft.com/en-us/character/${response.data.realm}/${response.data.name}`,
       description: `**Average ILVL:** ${items.averageItemLevelEquipped.toLocaleString()}\n**Achievement Points:** ${response.data.achievementPoints.toLocaleString()}\n`,
       author: {
         name: `${char_name} @ ${response.data.realm}`,
         icon_url: spec_icon_url
       },
       thumbnail: {
         url: char_url_thumbnail
       },
       fields: [
         {
           name: "Stats",
           // Removing health and power for now...
           // `**Health:** ${stats.health} \n**${power_name_cap}:** ${stats.power} \n**Strength:** ${stats.str} \n**Agility:** ${stats.agi} \n**Intellect:** ${stats.int} \n**Stamina:** ${stats.sta} \n**Critical Strike:** ${stats.critRating} (${stats.crit.toFixed(2)}%)\n**Haste:** ${stats.hasteRating} (${stats.haste.toFixed(2)}%)\n**Mastery:** ${stats.masteryRating} (${stats.mastery.toFixed(2)}%)\n**Versatility:** ${stats.versatility}\n`,
           value: `**Health:** ${stats.health.toLocaleString()} \n**${main_stat}:** ${main_stat_value.toLocaleString()} \n**Stamina:** ${stats.sta.toLocaleString()} \n**Critical Strike:** ${stats.critRating.toLocaleString()} (${stats.crit.toFixed(2)}%)\n**Haste:** ${stats.hasteRating.toLocaleString()} (${stats.haste.toFixed(2)}%)\n**Mastery:** ${stats.masteryRating.toLocaleString()} (${stats.mastery.toFixed(2)}%)\n**Versatility:** ${stats.versatility.toLocaleString()} (${vers_bonus.toFixed(2)}%)\n`,
           inline: true
         },
         {
           name: "Raid Progression",
           value: `**${raid_0.name}:** ${`${raid_0_kills_lfr} \/ ${raid_0_kills_n} \/ ${raid_0_kills_h} \/ ${raid_0_kills_m}`} \n**${raid_1.name}:** ${`${raid_1_kills_lfr} \/ ${raid_1_kills_n} \/ ${raid_1_kills_h} \/ ${raid_1_kills_m}`} \n**${raid_2.name}:** ${`${raid_2_kills_lfr} \/ ${raid_2_kills_n} \/ ${raid_2_kills_h} \/ ${raid_2_kills_m}`}`,
           inline: true
         },
         {
           name: "PVP",
           value: `**2v2 Rating:** ${pvp_brackets.ARENA_BRACKET_2v2.rating.toLocaleString()} \n**3v3 Rating:** ${pvp_brackets.ARENA_BRACKET_3v3.rating.toLocaleString()} \n**Battleground Rating:** ${pvp_brackets.ARENA_BRACKET_RBG.rating.toLocaleString()} \n**Honorable Kills:** ${response.data.totalHonorableKills.toLocaleString()} \n`,
           inline: true
         },
         {
           name: "Mythic+",
           value: `**Weekly Best:**\n${weekly_best_report}`,
           inline: true
         }
       ],
       image: {
         url: char_url_main
       },
       footer: {
         icon_url: bilgewater_icon_url,
         text: "Powered by Bilgewater Bot"
       },
       timestamp: new Date()
     }});
    //console.log(response.data);
  }).catch(error => {

     winston.log('error', chalk.bgRed(`toon: ${error}\n ${error.stack}`));
     message.channel.send("```Character not found. Check spelling and region.```");
   });
}

function upgradesToResult(keystoneUpgrades)
{
  if(keystoneUpgrades < 1)
    return "Depleted";
  else
    return `+${keystoneUpgrades}`;
}

function msToTime(duration)
{
  var seconds = parseInt((duration/1000)%60);
  var minutes = parseInt((duration/(1000*60))%60);

  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return minutes + "m " + seconds + "s";
}
