var config = require('../config.json');
var winston = require('winston');
var chalk = require('chalk');
var database = require('better-sqlite3');
var pad = require('pad');
var util = require('util');
var common = require('../util/common');

var db = null;

var bookmark = '';
var character = '';
var realm = '';
var region = '';

var blackList = ['encounters', 'raids', 'tot', 'soo', 'hm', 'brf', 'hfc', 'en', 'tov', 'nh', 'tos', 'abt'];

var bookmarkLimit = 25; // Hardcoded for now, mostly to prevent message length overflow when printing bookmark list

exports.run = function(client, message, args) {

  // Remove extra leading spaces from args
  for (var i = 0; i < args.length; i++) {
      if (args[i] === '') {
        args.splice(i, 1);
        i--;
      }
  }

  if (args.length === 1 && args[0] === 'list') {
    listBookmarks(message);
  } else
  if (args.length === 2) {
    if (args[0] === 'delete') {
      bookmark = args[1];
      deleteBookmark(message, bookmark);
    } else
    if (args[0] === 'main') {
      bookmark = args[1];
      mainBookmark(message, bookmark);
    } else {
      sendUsageResponse(message);
    }
  } else
  if (args.length >= 5 && args[0] === 'add') {
    bookmark = args[1];
    character = args[2];
    realm = args[3];
    region = args[4];
    if (validateBookmark(message, bookmark)) {
      addBookmark(message, bookmark, character, realm, region);
      if (args.length > 5 && args[5] == '-m') {
        mainBookmark(message, bookmark);
      }
    }
  } else {
    sendUsageResponse(message);
  }

};

function addBookmark(message, bookmark, character, realm, region) {
  if (blackList.includes(bookmark)) {
    message.reply(`Sorry, \'${bookmark}\' is a blacklisted bookmark name. Try using a different name.`);
    return;
  }

  var bookmarkObject = {
    "bookmark": bookmark,
    "character": common.capitalizeFirstLetter(character),
    "realm": common.capitalizeFirstLetter(realm),
    "region": region.toUpperCase()
  };

  console.log(`Opening database...`);
  db = new database('data/users.sqlite');
  var bookmarks = '';
  var bookmarkArray = [];
  var bookmarkSlot = -1;
  try {
    console.log(`Getting row for user ${message.author.id}`);
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) {
      bookmarkArray.push(bookmarkObject);
      bookmarks = JSON.stringify(bookmarkArray);
      console.log(`Inserting row for user ${message.author.id}`);
      db.prepare('INSERT INTO users (userId, bookmarks) VALUES (?, ?)').run([message.author.id, bookmarks]);
      message.reply(`bookmark \"${bookmarkObject.bookmark}\" added for ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
      `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`);
    } else
    bookmarkArray = JSON.parse(row.bookmarks);
    if (bookmarkArray.length >= bookmarkLimit) {
      message.reply(`Sorry, you've reached the maximum amount of bookmarks. Please delete a bookmark before adding antoher.`);
      return;
    }
    bookmarkSlot = findBookmarkSlot(bookmarkArray, bookmark); // Check if bookmark already exists, update it if so
    if (bookmarkSlot === -1) {
      console.log(`Adding bookmark for user ${message.author.id}`);
      bookmarkArray.push(bookmarkObject);
      bookmarks = JSON.stringify(bookmarkArray);
      message.reply(`bookmark \"${bookmarkObject.bookmark}\" added for ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
      `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`);
    } else
    {
      bookmarkArray[bookmarkSlot].character = character;
      bookmarkArray[bookmarkSlot].realm = realm;
      bookmarkArray[bookmarkSlot].region = region;
      bookmarks = JSON.stringify(bookmarkArray);
      message.reply(`bookmark \"${bookmarkObject.bookmark}\" updated to ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
      `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`);
    }
    db.prepare(`UPDATE users SET bookmarks = ? WHERE userId = ?`).run([bookmarks, message.author.id]);
  }
  catch (e) {
    console.log(e);
    console.log(`Creating table`);

    db.prepare("CREATE TABLE IF NOT EXISTS users (userId TEXT DEFAULT (''), bookmarks TEXT DEFAULT (''), main TEXT DEFAULT (''))").run();

    bookmarkArray = [bookmarkObject];
    bookmarks = JSON.stringify(bookmarkArray);
    console.log(`Inserting row for user ${message.author.id}`);
    db.prepare("INSERT INTO users (userId, bookmarks) VALUES (?, ?)").run([message.author.id, bookmarks]);
    message.reply(`bookmark \"${bookmarkObject.bookmark}\" added for ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
    `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`);
  }

  console.log(`Closing database...`);
  db.close();
}

function deleteBookmark(message, bookmark) {
  console.log(`Opening database...`);
  db = new database('data/users.sqlite');
  var bookmarkSlot = -1;
  try {
    console.log(`Getting row for user ${message.author.id}`);
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) {
      message.reply(`You don't have any bookmarks to delete.`);
    } else
    bookmarkArray = JSON.parse(row.bookmarks);
    bookmarkSlot = findBookmarkSlot(bookmarkArray, bookmark);
    if (bookmarkSlot === -1) {
      message.reply(`You haven't bookmarked anything by that name.`);
    } else
    {
      bookmarkArray.splice(bookmarkSlot, 1);
      var bookmarks = JSON.stringify(bookmarkArray);
      db.prepare(`UPDATE users SET bookmarks = ? WHERE userId = ?`).run([bookmarks, message.author.id]);
      if (row.main === bookmark) {
        db.prepare(`UPDATE users SET main = '' WHERE userId = ?`).run([message.author.id]);
      }
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

function mainBookmark(message, bookmark) {
  console.log(`Opening database...`);
  db = new database('data/users.sqlite');
  try {
    console.log(`Getting row for user ${message.author.id}`);
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) {
      message.reply(`You don't have any bookmarks to set as a main.`);
    } else
    bookmarkArray = JSON.parse(row.bookmarks);
    bookmarkSlot = findBookmarkSlot(bookmarkArray, bookmark);
    if (bookmarkSlot === -1) {
      message.reply(`You haven't bookmarked anything by that name.`);
    } else
    {
      db.prepare(`UPDATE users SET main = ? WHERE userId = ?`).run([bookmark, message.author.id]);
      message.reply(`Bookmark \'${bookmark}\' set as main!`);
    }
  }
  catch (e) {
    console.log(e);
    message.reply(`You don't have any bookmarks to set as a main.`);
  }

  console.log(`Closing database...`);
  db.close();
}

function listBookmarks(message) {
  console.log(`Opening database...`);
  db = new database('data/users.sqlite');
  try {
    console.log(`Getting row for user ${message.author.id}`);
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) {
      message.reply(`I got what you need.... except for bookmarks, because you haven't added any yet.`);
    } else {
      var main = row.main;
      var bookmarkString = '|Bilgewater Bookmarks===================================|\n';
      bookmarkString += '|-------------------------------------------------------|\n';
      bookmarkString += '|# |Bookmark      |Character     |Realm         |Region |\n';
      bookmarkString += '|-------------------------------------------------------|';
      bookmarkArray = JSON.parse(row.bookmarks);
      for (var i = 0; i < bookmarkArray.length; i++) {
        var bookmarkStringTemp = `${bookmarkArray[i].bookmark}`;
        if (bookmarkArray[i].bookmark === main) {
          bookmarkStringTemp += '(*)';
        }
        bookmarkString += `\n|${pad(2, common.formatNumberLength(i + 1, 2))}|${pad(bookmarkStringTemp, 14)}|${pad(common.capitalizeFirstLetter(bookmarkArray[i].character), 14)}|` +
        `${pad(common.capitalizeFirstLetter(bookmarkArray[i].realm), 14)}|${pad(bookmarkArray[i].region.toUpperCase(), 7)}|`;
      }
      bookmarkString += '\n|=======================================================|';
      if(main != '') {
        bookmarkString += `\n\n(*) = Main Bookmark`;
      }
      bookmarkString += `\n\nType >bookmarks main <bookmark> to set a main bookmark`;
      if (bookmarkArray.length > 0) {
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

function findBookmarkSlot(bookmarkArray, bookmark) {
  for(var i = 0; i < bookmarkArray.length; i++) {
    if (bookmarkArray[i].bookmark === bookmark) {
      return i;
    }
  }
  return -1;
}

function validateBookmark(message, bookmark) {
    if (!bookmark.match(/^[0-9a-z]+$/)) {
      message.reply('bookmark name must be alphanumeric, please input a different name.');
      return false;
    }
    if(bookmark.length > 10 || bookmark.length < 1) {
      message.reply('bookmark name must be between 1 and 10 characters, please input a different name.');
      return false;
    }
    return true;
}

function sendUsageResponse(message) {
  var usage = `Usage: \n\n${config.prefix}bookmarks add <bookmark name> <character name> <realm> <region>\n\n` +
  `Optional Arguments:\n\n-m       Set the bookmark as the main\n\n` +
  `Additional Info:\n\nYou can bookmark up to ${bookmarkLimit} characters, assigning a unique name to each bookmark.\n` +
  `Type \"${config.prefix}bookmarks delete <bookmark>\" to delete a bookmark.\nType \"${config.prefix}bookmarks list\" to view your stored bookmarks.` +
  `\nType \"${config.prefix}bookmarks main <bookmark>\" to set a main bookmarks.`;
  var usageFormatted = '```' + usage + '```';
  message.channel.send(usageFormatted);
  return;
}

exports.findBookmark =  function(user, bookmark) {
  var foundBookmark = undefined;
  console.log(`Opening database...`);
  db = new database('data/users.sqlite');
  try {
    console.log(`Getting row for user ${user}`);
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(user);
    if (row) {
      bookmarkArray = JSON.parse(row.bookmarks);
      for (var i = 0; i < bookmarkArray.length; i++) {
        if (bookmarkArray[i].bookmark === bookmark) {
          foundBookmark = bookmarkArray[i];
          break;
        }
      }
    }
  }
  catch (e) {
    console.log(e);
  }
  console.log(`Closing database...`);
  db.close();

  return foundBookmark;
};

exports.findMain =  function(user) {
  var foundMain = undefined;
  console.log(`Opening database...`);
  db = new database('data/users.sqlite');
  try {
    console.log(`Getting row for user ${user}`);
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(user);
    if (row) {
      var main = row.main;
      if (main != '') {
        bookmarkArray = JSON.parse(row.bookmarks);
        for (var i = 0; i < bookmarkArray.length; i++) {
          if (bookmarkArray[i].bookmark === main) {
            foundMain = bookmarkArray[i];
          }
        }
      }
    }
  }
  catch (e) {
    console.log(e);
  }
  console.log(`Closing database...`);
  db.close();

  return foundMain;
};
