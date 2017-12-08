const config = require('../config.json');
const winston = require('winston');
const chalk = require('chalk');
const database = require('better-sqlite3');
const pad = require('pad');

var db = null;

var bookmark = '';
var character = '';
var realm = '';
var region = '';

var blackList = ['encounters', 'raids'];

exports.run = function(client, message, args) {

  if (args.length === 1 && args[0] === 'list') {
    listBookmarks(message);
  } else
  if (args.length === 2 && args[0] === 'delete') {
    bookmark = args[1];
    deleteBookmark(message, bookmark)
  } else
  if (args.length === 5 && args[0] === 'add') {
    bookmark = args[1];
    character = args[2];
    realm = args[3];
    region = args[4];
    addBookmark(message, bookmark, character, realm, region);
  } else {
    sendUsageResponse(message);
  }

};

function addBookmark(message, bookmark, character, realm, region) {
  if (blackList.includes(bookmark)) {
    message.reply(`Sorry, \'${bookmark}\' is a blacklisted bookmark name. Try using a different name.`);
    return;
  }
  console.log(`Opening database...`);
  db = new database('./users.sqlite');
  var bookmarkSlot = -1;
  try {
    console.log(`Getting row for user ${message.author.id}`);
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) {
      console.log(`Inserting row for user ${message.author.id}`);
      db.prepare('INSERT INTO users (userId, bookmark0, character0, realm0, region0) VALUES (?, ?, ?, ?, ?)').run([message.author.id, bookmark, character, realm, region]);
      message.reply(`Bookmark \'${bookmark}\' added!`);
    } else
    bookmarkSlot = findBookmarkSlot(row, bookmark); // Check if bookmark already exists, update it if so
    if (bookmarkSlot === -1) {
      bookmarkSlot = findBookmarkSlot(row, ''); // Find next open bookmark
      if ( bookmarkSlot === -1) {
        var error = 'All bookmarks slots in use. Please remove a bookmark before adding a new one.';
        var errorFormatted = '```' + error + '```';
        message.channel.send(errorFormatted);
      } else {
        console.log(`Adding bookmark for user ${message.author.id}`);
        db.prepare(`UPDATE users SET bookmark${bookmarkSlot} = ?, character${bookmarkSlot} = ?, realm${bookmarkSlot} = ?, region${bookmarkSlot} = ? WHERE userId = ?`).run([bookmark, character, realm, region, message.author.id]);
        message.reply(`Bookmark \'${bookmark}\' added!`);
      }
    } else
    {
      db.prepare(`UPDATE users SET character${bookmarkSlot} = ?, realm${bookmarkSlot} = ?, region${bookmarkSlot} = ? WHERE userId = ?`).run([character, realm, region, message.author.id]);
      message.reply(`Bookmark \'${bookmark}\' updated!`);
    }
  }
  catch (e) {
    console.log(e);
    console.log(`Creating table`);

    db.prepare("CREATE TABLE IF NOT EXISTS users (userId TEXT DEFAULT (''), bookmark0 TEXT DEFAULT (''), character0 TEXT DEFAULT (''), realm0 TEXT DEFAULT (''), region0 TEXT DEFAULT (''), " +
    "bookmark1 TEXT DEFAULT (''), character1 TEXT DEFAULT (''), realm1 TEXT DEFAULT (''), region1 TEXT DEFAULT (''), bookmark2 TEXT DEFAULT (''), character2 TEXT DEFAULT (''), realm2 TEXT DEFAULT (''), region2 TEXT DEFAULT (''), " +
    "bookmark3 TEXT DEFAULT (''), character3 TEXT DEFAULT (''), realm3 TEXT DEFAULT (''), region3 TEXT DEFAULT (''), bookmark4 TEXT DEFAULT (''), character4 TEXT DEFAULT (''), realm4 TEXT DEFAULT (''), region4 TEXT DEFAULT (''), " +
    "bookmark5 TEXT DEFAULT (''), character5 TEXT DEFAULT (''), realm5 TEXT DEFAULT (''), region5 TEXT DEFAULT (''), bookmark6 TEXT DEFAULT (''), character6 TEXT DEFAULT (''), realm6 TEXT DEFAULT (''), region6 TEXT DEFAULT (''), " +
    "bookmark7 TEXT DEFAULT (''), character7 TEXT DEFAULT (''), realm7 TEXT DEFAULT (''), region7 TEXT DEFAULT (''), bookmark8 TEXT DEFAULT (''), character8 TEXT DEFAULT (''), realm8 TEXT DEFAULT (''), region8 TEXT DEFAULT (''), " +
    "bookmark9 TEXT DEFAULT (''), character9 TEXT DEFAULT (''), realm9 TEXT DEFAULT (''), region9 TEXT DEFAULT (''))").run();

    console.log(`Inserting row for user ${message.author.id}`);
    db.prepare("INSERT INTO users (userId, bookmark0, character0, realm0, region0) VALUES (?, ?, ?, ?, ?)").run([message.author.id, bookmark, character, realm, region]);
    message.reply(`Bookmark \'${bookmark}\' added!`);
  }

  console.log(`Closing database...`);
  db.close();
}

function deleteBookmark(message, bookmark) {
  console.log(`Opening database...`);
  db = new database('./users.sqlite');
  var bookmarkSlot = -1;
  try {
    console.log(`Getting row for user ${message.author.id}`);
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) {
      message.reply(`You don't have any bookmarks to delete.`);
    } else
    bookmarkSlot = findBookmarkSlot(row, bookmark); // Check if bookmark already exists, update it if so
    if (bookmarkSlot === -1) {
      message.reply(`You haven't bookmarked anything by that name.`);
    } else
    {
      db.prepare(`UPDATE users SET bookmark${bookmarkSlot} = '', character${bookmarkSlot} = '', realm${bookmarkSlot} = '', region${bookmarkSlot} = '' WHERE userId = ?`).run([message.author.id]);
      message.reply(`Bookmark \'${bookmark}\' deleted!`);
    }
  }
  catch (e) {
    console.log(e);
    message.reply(`You don't have any bookmarks to delete.`);
  }

  console.log(`Closing database...`);
  db.close();
}

function listBookmarks(message) {
  console.log(`Opening database...`);
  db = new database('./users.sqlite');
  try {
    console.log(`Getting row for user ${message.author.id}`);
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) {
      message.reply(`I got what you need.... except for bookmarks, because you haven't added any yet.`);
    } else {
      var bookmarksAdded = false;
      var bookmarkString = '|Bilgewater Bookmarks================================|\n';
      bookmarkString += '|----------------------------------------------------|\n';
      bookmarkString += '|Bookmark      |Character     |Realm         |Region |\n';
      bookmarkString += '|----------------------------------------------------|';
      if (row.bookmark0) {
        bookmarkString += `\n|${pad(row.bookmark0, 14)}|${pad(capitalizeFirstLetter(row.character0), 14)}|${pad(capitalizeFirstLetter(row.realm0), 14)}|${pad(row.region0.toUpperCase(), 7)}|`;
        bookmarksAdded = true;
      }
      if (row.bookmark1) {
        bookmarkString += `\n|${pad(row.bookmark1, 14)}|${pad(capitalizeFirstLetter(row.character1), 14)}|${pad(capitalizeFirstLetter(row.realm1), 14)}|${pad(row.region1.toUpperCase(), 7)}|`;
        bookmarksAdded = true;
      }
      if (row.bookmark2) {
        bookmarkString += `\n|${pad(row.bookmark2, 14)}|${pad(capitalizeFirstLetter(row.character2), 14)}|${pad(capitalizeFirstLetter(row.realm2), 14)}|${pad(row.region2.toUpperCase(), 7)}|`;
        bookmarksAdded = true;
      }
      if (row.bookmark3) {
        bookmarkString += `\n|${pad(row.bookmark3, 14)}|${pad(capitalizeFirstLetter(row.character3), 14)}|${pad(capitalizeFirstLetter(row.realm3), 14)}|${pad(row.region3.toUpperCase(), 7)}|`;
        bookmarksAdded = true;
      }
      if (row.bookmark4) {
        bookmarkString += `\n|${pad(row.bookmark4, 14)}|${pad(capitalizeFirstLetter(row.character4), 14)}|${pad(capitalizeFirstLetter(row.realm4), 14)}|${pad(row.region4.toUpperCase(), 7)}|`;
        bookmarksAdded = true;
      }
      if (row.bookmark5) {
        bookmarkString += `\n|${pad(row.bookmark5, 14)}|${pad(capitalizeFirstLetter(row.character5), 14)}|${pad(capitalizeFirstLetter(row.realm5), 14)}|${pad(row.region5.toUpperCase(), 7)}|`;
        bookmarksAdded = true;
      }
      if (row.bookmark6) {
        bookmarkString += `\n|${pad(row.bookmark6, 14)}|${pad(capitalizeFirstLetter(row.character6), 14)}|${pad(capitalizeFirstLetter(row.realm6), 14)}|${pad(row.region6.toUpperCase(), 7)}|`;
        bookmarksAdded = true;
      }
      if (row.bookmark7) {
        bookmarkString += `\n|${pad(row.bookmark7, 14)}|${pad(capitalizeFirstLetter(row.character7), 14)}|${pad(capitalizeFirstLetter(row.realm7), 14)}|${pad(row.region7.toUpperCase(), 7)}|`;
        bookmarksAdded = true;
      }
      if (row.bookmark8) {
        bookmarkString += `\n|${pad(row.bookmark8, 14)}|${pad(capitalizeFirstLetter(row.character8), 14)}|${pad(capitalizeFirstLetter(row.realm8), 14)}|${pad(row.region8.toUpperCase(), 7)}|`;
        bookmarksAdded = true;
      }
      if (row.bookmark9) {
        bookmarkString += `\n|${pad(row.bookmark9, 14)}|${pad(capitalizeFirstLetter(row.character9), 14)}|${pad(capitalizeFirstLetter(row.realm9), 14)}|${pad(row.region9.toUpperCase(), 7)}|`;
        bookmarksAdded = true;
      }
      if (bookmarksAdded) {
        var bookmarkStringFormatted = '```css\n' + bookmarkString + '```';
        message.channel.send(`${bookmarkStringFormatted}`);
      } else {
        message.reply(`I got what you need.... except for bookmarks, because you haven't added any yet.`);
      }
    }
  }
  catch (e) {
    console.log(e);
    message.reply(`I got what you need.... except for bookmarks, because you haven't added any yet.`);
  }

  console.log(`Closing database...`);
  db.close();
}

function findBookmarkSlot(row, bookmark) {
  if (row.bookmark0.toLowerCase() === bookmark.toLowerCase()) {
    return 0;
  } else
  if (row.bookmark1.toLowerCase() === bookmark.toLowerCase()) {
    return 1;
  } else
  if (row.bookmark2.toLowerCase() === bookmark.toLowerCase()) {
    return 2;
  } else
  if (row.bookmark3.toLowerCase() === bookmark.toLowerCase()) {
    return 3;
  } else
  if (row.bookmark4.toLowerCase() === bookmark.toLowerCase()) {
    return 4;
  } else
  if (row.bookmark5.toLowerCase() === bookmark.toLowerCase()) {
    return 5;
  } else
  if (row.bookmark6.toLowerCase() === bookmark.toLowerCase()) {
    return 6;
  } else
  if (row.bookmark7.toLowerCase() === bookmark.toLowerCase()) {
    return 7;
  } else
  if (row.bookmark8.toLowerCase() === bookmark.toLowerCase()) {
    return 8;
  } else
  if (row.bookmark9.toLowerCase() === bookmark.toLowerCase()) {
    return 9;
  } else {
    return -1;
  }
}

function sendUsageResponse(message) {
  var usage = `Usage: \n\n${config.prefix}bookmarks add <bookmark name> <character name> <realm> <region>\n\n` +
  `Additional Info:\n\nYou can bookmark up to 10 characters, assigning a unique name to each bookmark\n\n` +
  `Use "${config.prefix}bookmarks delete <bookmark>" to delete a bookmark\n\nUse "${config.prefix}bookmarks list" to view your stored bookmarks`;
  var usageFormatted = '```' + usage + '```';
  message.channel.send(usageFormatted);
  return;
}

exports.findBookmarkValues =  function(user, bookmark) {
  var bookmarkValues = {
    'character': null,
    'realm': null,
    'region': null
  };

  console.log(`Opening database...`);
  db = new database('./users.sqlite');
  try {
    console.log(`Getting row for user ${user}`);
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(user);
    if (row) {
      if (row.bookmark0.toLowerCase() === bookmark.toLowerCase()) {
        bookmarkValues.character = row.character0;
        bookmarkValues.realm = row.realm0;
        bookmarkValues.region = row.region0;
      } else
      if (row.bookmark1.toLowerCase() === bookmark.toLowerCase()) {
        bookmarkValues.character = row.character1;
        bookmarkValues.realm = row.realm1;
        bookmarkValues.region = row.region1;
      } else
      if (row.bookmark2.toLowerCase() === bookmark.toLowerCase()) {
        bookmarkValues.character = row.character2;
        bookmarkValues.realm = row.realm2;
        bookmarkValues.region = row.region2;
      } else
      if (row.bookmark3.toLowerCase() === bookmark.toLowerCase()) {
        bookmarkValues.character = row.character3;
        bookmarkValues.realm = row.realm3;
        bookmarkValues.region = row.region3;
      } else
      if (row.bookmark4.toLowerCase() === bookmark.toLowerCase()) {
        bookmarkValues.character = row.character4;
        bookmarkValues.realm = row.realm4;
        bookmarkValues.region = row.region4;
      } else
      if (row.bookmark5.toLowerCase() === bookmark.toLowerCase()) {
        bookmarkValues.character = row.character5;
        bookmarkValues.realm = row.realm5;
        bookmarkValues.region = row.region5;
      } else
      if (row.bookmark6.toLowerCase() === bookmark.toLowerCase()) {
        bookmarkValues.character = row.character6;
        bookmarkValues.realm = row.realm6;
        bookmarkValues.region = row.region6;
      } else
      if (row.bookmark7.toLowerCase() === bookmark.toLowerCase()) {
        bookmarkValues.character = row.character7;
        bookmarkValues.realm = row.realm7;
        bookmarkValues.region = row.region7;
      } else
      if (row.bookmark8.toLowerCase() === bookmark.toLowerCase()) {
        bookmarkValues.character = row.character8;
        bookmarkValues.realm = row.realm8;
        bookmarkValues.region = row.region8;
      } else
      if (row.bookmark9.toLowerCase() === bookmark.toLowerCase()) {
        bookmarkValues.character = row.character9;
        bookmarkValues.realm = row.realm9;
        bookmarkValues.region = row.region9;
      }
    }
  }
  catch (e) {
    console.log(e);
  }
  console.log(`Closing database...`);
  db.close();

  return bookmarkValues;
};

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
