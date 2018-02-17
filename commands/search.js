var config = require('../config.json');
var googleSearch = require('google-search');
var database = require('better-sqlite3');
var logging = require('../util/logging');

var search = new googleSearch({
  key: config.googleApi,
  cx: config.googleCx
});

exports.run = function(client, message, args) {
  if(args.length < 1) {
    sendUsageResponse(message);
    return;
  }
  db = new database('data/users.sqlite');
  try {
    var row = db.prepare("SELECT * FROM searches WHERE userId = ?").get(message.author.id);
    if (!row) {
      db.prepare("INSERT INTO searches (userId, lastSearchTime) VALUES (?, ?)").run([message.author.id, Date.now()]);
    } else
    {
      var timeSinceLastSearch = Date.now() - row.lastSearchTime;
      if(timeSinceLastSearch > config.searchDelay * 1000) {
        performSearch(message, args);
        db.prepare("UPDATE searches SET lastSearchTime = ? WHERE userId = ?").run([Date.now(), message.author.id]);
      } else {
        var timeTilNextSearch = ((config.searchDelay * 1000) - timeSinceLastSearch) / 1000;
        message.reply(`sorry, you must wait ${timeTilNextSearch.toFixed(2)} more seconds before searching again.`)
      }
    }
  }
  catch (error) {
    performSearch(message, args);
    db.prepare("CREATE TABLE IF NOT EXISTS searches (userId TEXT DEFAULT (''), lastSearchTime INTEGER DEFAULT (0))").run();
    db.prepare("INSERT INTO searches (userId, lastSearchTime) VALUES (?, ?)").run([message.author.id, Date.now()]);
  }
};

function performSearch(message, args) {
  var searchQuery = args.join(' ');
  logging.searchLogger.log({
    level: 'Info',
    message: `${message.author.username} searched for \'${searchQuery}\'`
  });
  search.build({
    q: searchQuery,
    num: 1,
  }, function(error, response) {
    if (error) {
      var owner = client.users.get(config.ownerID);
      message.channel.send(`Something's not quite right with searching... Complain to ${owner}`);
      logging.searchLogger.log({
        level: 'Error',
        message: error
      });
    }
    if(response.items && response.items.length > 0) {
      var result = response.items[0];
      message.channel.send(`**${result.title}**\n${result.link}`);
    } else {
      message.channel.send(`\`\`\`No search results found.\`\`\``);
    }
  });
}

function sendUsageResponse(message) {
  var usage = `\`\`\`Usage: \n\n${config.prefix}search <query>\`\`\``;
  message.channel.send(usage);
  return;
}
