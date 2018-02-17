var config = require('../config.json');
var util = require('util');
var common = require('..//util//common');
var logging = require('..//util//logging');
var request = require('request');
var database = require('better-sqlite3');
var blizzard = require('blizzard.js').initialize({ apikey: config.battlenet });
var bookmark = require('./bookmarks');
var moment = require('moment');

var iconSize = 56;

var db = null;

var itemName = '';
var itemId;
var realm = '';
var region = 'US';
var optionalArgStart = 0;

var validRegions = ['us', 'eu', 'kr', 'tw'];

var bilgewaterIconUrl = 'https://i.imgur.com/zjBxppj.png';
var tsmIconUrl = 'https://i.imgur.com/OdfV93u.png';
var iconRenderUrl = 'https://render-%s.worldofwarcraft.com/icons/56/%s.jpg';

var tsmRequestItemsUrl = 'http://api.tradeskillmaster.com/v1/item/US/tichondrius?format=json&fields=Id%2CName&apiKey=%s';
var tsmRequestItemDataUrl = 'http://api.tradeskillmaster.com/v1/item/%s/%s/%s?format=json&apiKey=%s';

var lastMessage;
var gold;
var silver;
var copper;

exports.run = function(client, message, args) {
  message.reply("sorry, this command is currently inactive due to Blizzard API changes.");
  return;
  
  gold = client.emojis.find("name", "gold");
  silver = client.emojis.find("name", "silver");
  copper = client.emojis.find("name", "copper");

  var optionalArgPassed = false;
  var realmSpecified = false;
  var regionSpecified = false;

  if (args.length >= 1) {
    itemName = "";

    for (var i = optionalArgStart; i < args.length; i++) {
      var arg = args[i].toLowerCase();
      if (arg === '-r') {
        optionalArgPassed = true;
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
      } else
      if (arg === '-s') {
        optionalArgPassed = true;
        if (i >= args.length - 1) {
          var errorMessage = `\`\`\`Realm flag given but no realm specified.\`\`\``;
          message.channel.send(errorMessage);
          return;
        }
        i++;
        realm = common.capitalizeFirstLetter(args[i]);
        realmSpecified = true;
      } else
      if (!optionalArgPassed){
        if (itemName === "") {
          itemName = args[i];
        } else {
          itemName += ` ${args[i]}`;
        }
      }
    }

    if(!realmSpecified || !regionSpecified) {
      var main = bookmark.findMain(message.author.id);
      if (main != undefined) {
        if(!realmSpecified) {
          if (!isValidRegion(main.region)) {
            var errorMessage = `\`\`\`Invalid region. Valid regions are us, eu, kr, and tw.\`\`\``;
            message.channel.send(errorMessage);
            return;
          }
          realm = main.realm;
        }
        if(!regionSpecified) {
          region = main.region;
        }
      }
    }

    itemId = -1;

    logging.priceLogger.log({
      level: 'Info',
      message: `(price.js:run) Opening items database. Searching for \'${itemName.toLowerCase()}\'...`
    });

    var nextAccess;
    db = new database('data/items.sqlite');
    try {
      var row = db.prepare(`SELECT * FROM items WHERE Name = ? COLLATE NOCASE`).get(itemName.toLowerCase());
      if(row) {
        logging.priceLogger.log({
          level: 'Info',
          message: `(price.js:run) Item found! ID: ${row.Id}, Name: ${row.Name}`
        });

        itemId = row.Id;
        nextAccess = new moment(row.LastAccess).add(1, 'hours');
        var currentTime = new moment();

        if (nextAccess.diff(currentTime, 'hours') < 1) {
          logging.priceLogger.log({
            level: 'Info',
            message: `(price.js:run) Item (${row.Id}, ${row.Name}) was accessed less than an hour ago. Using cached data.`
          });
        }
      }
    }
    catch (e) {
      updateItemDB();
    }
    logging.priceLogger.log({
      level: 'Info',
      message: `(price.js:run) Closing items database.`
    });
    db.close();

    if (itemId === -1) {
      message.reply("no data available for that item, check name and spelling.");
      return;
    }

    message.reply("fetching auction data for you...");

    var requestItemData = util.format(tsmRequestItemDataUrl, region.toUpperCase(), realm, itemId, config.tsm);
    var options = {
      url: requestItemData,
      headers: {
        'User-Agent': 'request'
      }
    };

    lastMessage = message;
    request(options, processGetItem);

  } else
  {
    sendUsageResponse(message);
  }
};

function isValidRegion(region) {
  for (var i = 0; i < validRegions.length; i++) {
    if (validRegions[i].toLowerCase() == region.toLowerCase())
      return true;
  }
  return false;
}

function sendUsageResponse(message) {
  var usage = `\`\`\`Usage: \n\n${config.prefix}price <item>` +
    `\n\nOptional Arguments:\n\n-s <realm>       Specify the realm.\n` +
    `\n-r <region>       Specify the realm's region. Valid regions are us(*), eu, kr, and tw\n` +
    `\n(*) = Default value if no main bookmark set\n\n\`\`\``;
    message.channel.send(usage);
    return;
}

exports.updateItemDB = function() {
  logging.priceLogger.log({
    level: 'Info',
    message: '(price.js:updateItemDB) Updating items database...'
  });

  var requestItems = util.format(tsmRequestItemsUrl, config.tsm);

  var options = {
    url: requestItems,
    headers: {
      'User-Agent': 'request'
    }
  };

  request(options, processItemUpdates);
};

function processGetItem(err, res, body) {
  if (err) {
    logging.priceLogger.log({
      level: 'Error',
      message: `(price.js:processGetItem) ${err}`
    });
    return;
  }

  var responseItemData = JSON.parse(body);

  logging.priceLogger.log({
    level: 'Info',
    message: `(price.js:processGetItem) ${body}`
  });

  if (responseItemData.Name === undefined) {
      lastMessage.reply(`invalid realm/region combination, please try again.`);
      return;
  }

  blizzard.wow.item({ id: itemId, origin: 'us' })
  .then(response => {
    var embedColor = 0x4d3f7a; // Dark purple

    var marketValue = responseItemData.MarketValue;
    var minBuyout = responseItemData.MinBuyout;
    var regionMarketAvg = responseItemData.RegionMarketAvg;
    var historicalPrice = responseItemData.HistoricalPrice;
    var vendorSell = responseItemData.VendorSell;

    var iconUrl = util.format(iconRenderUrl, region, response.data.icon);
    var authorIconUrl = util.format(iconRenderUrl, region, 'inv_misc_coin_01');

    lastMessage.channel.send({embed: {
       color: embedColor,
       url: responseItemData.URL,
       description: `[TSM Item Page](${responseItemData.URL})`,
       author: {
         name: `${responseItemData.Name} @ ${realm} (${region.toUpperCase()})`,
         icon_url: authorIconUrl
       },
       thumbnail: {
         url: iconUrl
       },
       fields: [
         {
           name: `Market Value`,
           value: `${toGold(responseItemData.MarketValue)}`,
           inline: true
         },
         {
           name: `Min Buyout`,
           value: `${toGold(responseItemData.MinBuyout)}`,
           inline: true
         },
         {
           name: `Percent MV`,
           value: `${Math.round((responseItemData.MinBuyout / responseItemData.MarketValue) * 100)}`,
           inline: true
         },
         {
           name: `Historical Value`,
           value: `${toGold(responseItemData.HistoricalPrice)}`,
           inline: true
         },
         {
           name: `Quantity`,
           value: `${responseItemData.Quantity}`,
           inline: true
         },
         {
           name: `Region Market Avg`,
           value: `${toGold(responseItemData.RegionMarketAvg)}`,
           inline: true
         },
         {
           name: `Region Avg Daily Sold`,
           value: `${responseItemData.RegionAvgDailySold}`,
           inline: true
         },
         {
           name: `Vendor Value`,
           value: `${toGold(responseItemData.VendorSell)}`,
           inline: true
         }
       ],
       footer: {
         icon_url: tsmIconUrl,
         text: 'Auction Data | Powered by TradeSkillMaster'
       }
     }});
  });
}

function processItemUpdates(err, res, body) {
  if (err) {
    logging.priceLogger.log({
      level: 'Error',
      message: `(price.js:processItemUpdates) ${err}`
    });
    return;
  }

  var responseItems = JSON.parse(body);
  logging.priceLogger.log({
    level: 'Info',
    message: `(price.js:processItemUpdates) Begin processItemUpdates. Opening items database...`
  });
  db = new database('data/items.sqlite');

  if (body.indexOf('error') > -1)
  {
    logging.priceLogger.log({
      level: 'Error',
      message: `(price.js:run) ${body}`
    });
  }

  // First check if table exists
  try {
    var row = db.prepare(`SELECT * FROM items WHERE Id = ?`).get(-1)
  }
  catch (e) {
    logging.priceLogger.log({
      level: 'Error',
      message: `(price.js:processItemUpdates) ${e}. No items table found. Creating items table...`
    });

    db.prepare("CREATE TABLE IF NOT EXISTS items (Id INTEGER DEFAULT (-1), Name TEXT DEFAULT (''), " +
    "Level INTEGER DEFAULT (1), Class TEXT DEFAULT (''), SubClass TEXT DEFAULT (''), " +
    "VendorBuy INTEGER DEFAULT (0), VendorSell INTEGER DEFAULT (0), MarketValue INTEGER DEFAULT (0), " +
    "MinBuyout INTEGER DEFAULT (0), Quantity INTEGER DEFAULT (0), NumAuctions INTEGER DEFAULT (0), " +
    "HistoricalPrice INTEGER DEFAULT (0), RegionMarketAvg INTEGER DEFAULT (0), " +
    "RegionMinBuyoutAvg INTEGER DEFAULT (0), RegionQuantity INTEGER DEFAULT (0), " +
    "RegionHistoricalPrice INTEGER DEFAULT (0), RegionSaleAvg INTEGER DEFAULT (0), " +
    "RegionAvgDailySold REAL DEFAULT (0), RegionSaleRate REAL DEFAULT (0), " +
    "URL TEXT DEFAULT (''), LastAccess TEXT DEFAULT (''))").run();
  }

  for (var i = 0; i < responseItems.length; i++) {
    item = responseItems[i];
    var row = db.prepare(`SELECT * FROM items WHERE Id = ?`).get(item.Id)
    if(!row) {
      var currentTime = new moment();
      db.prepare("INSERT INTO items (Id, Name, Level, Class, SubClass, VendorBuy, VendorSell, " +
      "MarketValue, MinBuyout, Quantity, NumAuctions, HistoricalPrice, RegionMarketAvg, " +
      "RegionMinBuyoutAvg, RegionQuantity, RegionHistoricalPrice, RegionSaleAvg, RegionAvgDailySold, " +
      "RegionSaleRate, URL, LastAccess) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, " +
      "?, ?, ?, ?)").run([item.Id, item.Name, item.Level, item.Class, item.SubClass, item.VendorBuy,
      item.VendorSell, item.MarketValue, item.MinBuyout, item.Quantity, item.NumAuctions, item.HistoricalPrice,
      item.RegionMarketAvg, item.RegionMinBuyoutAvg, item.RegionQuantity, item.RegionHistoricalPrice,
      item.RegionSaleAvg, item.RegionAvgDailySold, item.RegionSaleRate, item.URL, currentTime.toISOString()]);
      logging.priceLogger.log({
        level: 'Info',
        message: `(price.js:processItemUpdates) Added new item to database: ${item.Name}`
      });
    }
  }
  logging.priceLogger.log({
    level: 'Info',
    message: `(price.js:processItemUpdates) End processItemUpdates. Closing items database.`
  });
  db.close();
  logging.priceLogger.log({
    level: 'Info',
    message: '(price.js:updateItemDB) items database updated!'
  });
}

function toGold(value) {
  var valueString = `%s${gold.toString()}%s${silver.toString()}%s${copper.toString()}`;
  var copperValue = value % 100;
  var silverValue = ((value % 10000) - copperValue) / 100;
  var goldValue = (value - (silverValue * 100) - copperValue) / 10000;

  if (copperValue === 0) {
    copperValue = '00';
  }
  if (silverValue === 0) {
    silverValue = '00';
  }

  return util.format(valueString, goldValue, silverValue, copperValue);
}
