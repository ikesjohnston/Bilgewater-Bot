const request = require('request');
const config = require('../config.json');
const winston = require('winston');
const chalk = require('chalk');
const util = require('util');

const iconRenderUrl = 'https://render-%s.worldofwarcraft.com/icons/56/%s.jpg';
const bilgewaterIconUrl = 'https://i.imgur.com/zjBxppj.png';

var region = 'us';

var responseAffixes;

exports.run = function(client, message, args) {

  if (args.length > 1) {
    message.channel.send(`Usage: \n\n${config.prefix}mp <region> \n\nValid regions are us, eu, kr, and tw.`);
    return;
  }

  else if (args.length == 1) {
    region = args[0];
    if (region != 'us' && region != 'eu' && region != 'kr' && region != 'tw') {
      message.channel.send(`Usage: \n\n${config.prefix}mp <region> \n\nValid regions are us, eu, kr, and tw.`);
      return;
    }
  }

  var mpIconUrl = util.format(iconRenderUrl, region, 'inv_relics_hourglass');

  request('https://raider.io/api/v1/mythic-plus/affixes?region=us', { json: true }, (err, res, body) => {
    if (err) {
      var owner = client.users.get(config.ownerID);
      message.channel.send(`Something's not quite right... Complain to ${owner}`);
      return console.log(err);
    }

    responseAffixes = res.body;

    var affixes = responseAffixes.affix_details;

    message.channel.send({embed: {
      color: 0xffb807,
      author: {
        name: 'Mythic+ Affixes This Week',
        icon_url: mpIconUrl
       },
       title: 'Retrieved from Raider.io',
       url: 'https://raider.io/mythic-plus',
       thumbnail: {
         url: mpIconUrl
       },
       fields: [
         {
           name: `(+4) ${affixes[0].name}`,
           value: `${affixes[0].description} [Read More.](${affixes[0].wowhead_url})`,
         },
         {
           name: `(+7) ${affixes[1].name}`,
           value: `${affixes[1].description} [Read More.](${affixes[1].wowhead_url})`,
         },
         {
           name: `(+10) ${affixes[2].name}`,
           value: `${affixes[2].description} [Read More.](${affixes[2].wowhead_url})\n\n[Weekly Leaderboard](${responseAffixes.leaderboard_url})`,
         }
       ],
       footer: {
         icon_url: bilgewaterIconUrl,
         text: 'Powered by Bilgewater Bot'
       },
       timestamp: new Date()
     }});
  });
};
