var config = require('../config.json');
var database = require('better-sqlite3');
var pad = require('pad');
var util = require('util');
var common = require('../util/common');
var logging = require('../util/logging');

var db = null;

var bookmark = '';
var character = '';
var realm = '';
var region = '';

// These will interfere with other commands
var blackList = ['encounters', 'raids', 'tot', 'soo', 'hm', 'brf', 'hfc', 'en', 'tov', 'nh', 'tos', 'abt'];

// Hardcoded for now, mostly to prevent message length overflow (2000 characters) when printing bookmark list
var bookmarkLimit = 25;

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

    logging.usersLogger.log({
      level: 'Warning',
      message: `(bookmarks.js:addBookmark) User ${message.author.id} requested to use a blacklisted bookmark name. Denying request.`
    });

    return;
  }

  var bookmarkObject = {
    "bookmark": bookmark,
    "character": common.capitalizeFirstLetter(character),
    "realm": common.capitalizeAllFirstLetters(realm),
    "region": region.toUpperCase()
  };

  logging.usersLogger.log({
    level: 'Info',
    message: `(bookmarks.js:addBookmark) Opening users database. Searching for user ${message.author.id}...`
  });

  db = new database('data/users.sqlite');
  var bookmarks = '';
  var bookmarkArray = [];
  var bookmarkSlot = -1;
  try {
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) { // Users first bookmark?
      bookmarkArray.push(bookmarkObject);
      bookmarks = JSON.stringify(bookmarkArray);

      logging.usersLogger.log({
        level: 'Info',
        message: `(bookmarks.js:addBookmark) User not found! Inserting row for user ${message.author.id}`
      });

      db.prepare('INSERT INTO users (userId, bookmarks) VALUES (?, ?)').run([message.author.id, bookmarks]);

      message.reply(`bookmark \"${bookmarkObject.bookmark}\" added for ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
      `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`);

      logging.usersLogger.log({
        level: 'Info',
        message: `(bookmarks.js:addBookmark) User ${message.author.id} added bookmark \"${bookmarkObject.bookmark}\" for ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
        `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`
      });
    } else {
      bookmarkArray = JSON.parse(row.bookmarks);
      if (bookmarkArray.length >= bookmarkLimit) {
        logging.usersLogger.log({
          level: 'Warning',
          message: `(bookmarks.js:addBookmark) ${message.author.id} is already at the bookmark limit. Denying request.`
        });
        message.reply(`Sorry, you've reached the maximum amount of bookmarks. Please delete a bookmark before adding antoher.`);
        return;
      }
      bookmarkSlot = findBookmarkSlot(bookmarkArray, bookmark); // Check if bookmark already exists, update it if so
      if (bookmarkSlot === -1) {
        bookmarkArray.push(bookmarkObject);
        bookmarks = JSON.stringify(bookmarkArray);

        message.reply(`bookmark \"${bookmarkObject.bookmark}\" added for ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
        `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`);

        logging.usersLogger.log({
          level: 'Info',
          message: `(bookmarks.js:addBookmark) User ${message.author.id} added bookmark \"${bookmarkObject.bookmark}\" for ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
          `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`
        });
      } else
      {
        bookmarkArray[bookmarkSlot].character = character;
        bookmarkArray[bookmarkSlot].realm = realm;
        bookmarkArray[bookmarkSlot].region = region;
        bookmarks = JSON.stringify(bookmarkArray);

        message.reply(`bookmark \"${bookmarkObject.bookmark}\" updated to ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
        `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`);

        logging.usersLogger.log({
          level: 'Info',
          message: `(bookmarks.js:addBookmark) User ${message.author.id} updated bookmark \"${bookmarkObject.bookmark}\" to ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
          `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`
        });
      }
      db.prepare(`UPDATE users SET bookmarks = ? WHERE userId = ?`).run([bookmarks, message.author.id]);
    }
  }
  catch (e) {
    logging.usersLogger.log({
      level: 'Warning',
      message: '(bookmarks.js:addBookmark) No users table found. Creating users table...'
    });

    db.prepare("CREATE TABLE IF NOT EXISTS users (userId TEXT DEFAULT (''), bookmarks TEXT DEFAULT (''), main TEXT DEFAULT (''))").run();

    bookmarkArray = [bookmarkObject];
    bookmarks = JSON.stringify(bookmarkArray);

    logging.usersLogger.log({
      level: 'Info',
      message: `(bookmarks.js:addBookmark) Inserting row for user ${message.author.id}`
    });

    db.prepare("INSERT INTO users (userId, bookmarks) VALUES (?, ?)").run([message.author.id, bookmarks]);

    message.reply(`bookmark \"${bookmarkObject.bookmark}\" added for ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
    `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`);

    logging.usersLogger.log({
      level: 'Info',
      message: `(bookmarks.js:addBookmark) User ${message.author.id} added bookmark \"${bookmarkObject.bookmark}\" for ${common.capitalizeFirstLetter(bookmarkObject.character)}, ` +
      `${common.capitalizeFirstLetter(bookmarkObject.realm)}, ${bookmarkObject.region.toUpperCase()}`
    });
  }

  logging.usersLogger.log({
    level: 'Info',
    message: '(bookmarks.js:addBookmark) Closing users database.'
  });

  db.close();
}

function deleteBookmark(message, bookmark) {
  logging.usersLogger.log({
    level: 'Info',
    message: '(bookmarks.js:deleteBookmark) Opening users database...'
  });

  db = new database('data/users.sqlite');

  var bookmarkSlot = -1;

  try {
    logging.usersLogger.log({
      level: 'Info',
      message: `(bookmarks.js:deleteBookmark) Getting row for user ${message.author.id}...`
    });

    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) {
      message.reply(`you don't have any bookmarks to delete.`);

      logging.usersLogger.log({
        level: 'Warning',
        message: `(bookmarks.js:deleteBookmark) User ${message.author.id} requested to delete a bookmark, but doesn't have any bookmarks stored. Denying request.`
      });
    } else
    bookmarkArray = JSON.parse(row.bookmarks);
    bookmarkSlot = findBookmarkSlot(bookmarkArray, bookmark);
    if (bookmarkSlot === -1) {
      message.reply(`you haven't bookmarked anything by that name.`);

      logging.usersLogger.log({
        level: 'Warning',
        message: `(bookmarks.js:deleteBookmark) User ${message.author.id} requested to delete bookmark \'${bookmark}\', but doesn't have a bookmark by that name. Denying request.`
      });
    } else
    {
      bookmarkArray.splice(bookmarkSlot, 1);
      var bookmarks = JSON.stringify(bookmarkArray);
      db.prepare(`UPDATE users SET bookmarks = ? WHERE userId = ?`).run([bookmarks, message.author.id]);
      if (row.main === bookmark) {
        db.prepare(`UPDATE users SET main = '' WHERE userId = ?`).run([message.author.id]);
      }
      message.reply(`Bookmark \'${bookmark}\' deleted!`);

      logging.usersLogger.log({
        level: 'Info',
        message: `(bookmarks.js:deleteBookmark) User ${message.author.id} deleted bookmark \"${bookmark}\"`
      });
    }
  }
  catch (e) {
    logging.usersLogger.log({
      level: 'Warning',
      message: `(bookmarks.js:deleteBookmark) User ${message.author.id} requested to delete a bookmark, but doesn't have any ` +
      `bookmarks stored. Denying request.`
    });
  }

  logging.usersLogger.log({
    level: 'Info',
    message: `(bookmarks.js:deleteBookmark) Closing users database.`
  });

  db.close();
}

function mainBookmark(message, bookmark) {
  logging.usersLogger.log({
    level: 'Info',
    message: `(bookmarks.js:mainBookmark) Opening users database...`
  });

  db = new database('data/users.sqlite');
  try {
    logging.usersLogger.log({
      level: 'Info',
      message: `(bookmarks.js:mainBookmark) Getting row for user ${message.author.id}...`
    });

    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) {
      message.reply(`you don't have any bookmarks to set as a main.`);

      logging.usersLogger.log({
        level: 'Warning',
        message: `(bookmarks.js:mainBookmark) User ${message.author.id} requested to set a bookmark as main but does not have any ` +
        `bookmarks stored. Denying request.`
      });
    } else
    bookmarkArray = JSON.parse(row.bookmarks);
    bookmarkSlot = findBookmarkSlot(bookmarkArray, bookmark);
    if (bookmarkSlot === -1) {
      message.reply(`You haven't bookmarked anything by that name.`);

      logging.usersLogger.log({
        level: 'Warning',
        message: `(bookmarks.js:mainBookmark) User ${message.author.id} requested to set bookmark \'${bookmark}\' as main but does not have a ` +
        `bookmark stored by that name. Denying request`
      });
    } else
    {
      db.prepare(`UPDATE users SET main = ? WHERE userId = ?`).run([bookmark, message.author.id]);
      message.reply(`Bookmark \'${bookmark}\' set as main!`);

      logging.usersLogger.log({
        level: 'Info',
        message: `(bookmarks.js:mainBookmark) User ${message.author.id} set bookmark \"${bookmark}\" as main.`
      });
    }
  }
  catch (e) {
    message.reply(`You don't have any bookmarks to set as a main.`);

    logging.usersLogger.log({
      level: 'Warning',
      message: `(bookmarks.js:mainBookmark) User ${message.author.id} requested to set a bookmark as main but does not have any ` +
      `bookmarks stored. Denying request`
    });
  }

  logging.usersLogger.log({
    level: 'Info',
    message: `(bookmarks.js:mainBookmark) Closing users database.`
  });

  db.close();
}

function listBookmarks(message) {
  logging.usersLogger.log({
    level: 'Info',
    message: `(bookmarks.js:listBookmarks) Opening users database...`
  });
  db = new database('data/users.sqlite');
  try {
    logging.usersLogger.log({
      level: 'Info',
      message: `(bookmarks.js:listBookmarks) Getting row for user ${message.author.id}...`
    });
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(message.author.id)
    if (!row) {
      message.reply(`you haven't added any bookmarks yet. Type \'${config.prefix}bookmarks\' ` +
      `for usage info.`);

      logging.usersLogger.log({
        level: 'Warning',
        message: `(bookmarks.js:listBookmarks) User ${message.author.id} requested a list of bookmarks but hasn't ` +
        `bookmarked anything yet. Denying request.`
      });
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
        `${pad(common.capitalizeFirstLetter(bookmarkArray[i].realm), 14)}|${pad(bookmarkArray[i].region, 7)}|`;
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
        message.reply(`you haven't added any bookmarks yet. Use \'${config.prefix}bookmarks add ` +
        `<bookmarkname> <character> <realm> <region>\' to add a bookmark.`);

        logging.usersLogger.log({
          level: 'Warning',
          message: `(bookmarks.js:listBookmarks) User ${message.author.id} requested a list of bookmarks but hasn't ` +
          `bookmarked anything yet. Denying request.`
        });
      }
    }
  }
  catch (e) {
    message.reply(`you haven't added any bookmarks yet. Type \'${config.prefix}bookmarks\' ` +
    `for usage info.`);

    logging.usersLogger.log({
      level: 'Warning',
      message: `(bookmarks.js:listBookmarks) User ${message.author.id} requested a list of bookmarks but hasn't ` +
      `bookmarked anything yet. Denying request.`
    });
  }

  logging.usersLogger.log({
    level: 'Info',
    message: `(bookmarks.js:listBookmarks) Closing users database.`
  });
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
    if (!bookmark.match(/^[0-9a-z]+$/) ||bookmark.length > 10 || bookmark.length < 1) {
      message.reply('bookmark name must be alphanumeric and between 1 and 10 characters, please input a different name.');
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

  logging.usersLogger.log({
    level: 'Info',
    message: `(bookmarks.js:findBookmark) Opening users database...`
  });

  db = new database('data/users.sqlite');
  try {
    logging.usersLogger.log({
      level: 'Info',
      message: `(bookmarks.js:findBookmark) Getting row for user ${user}...`
    });
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(user);
    if (row) {
      bookmarkArray = JSON.parse(row.bookmarks);
      for (var i = 0; i < bookmarkArray.length; i++) {
        if (bookmarkArray[i].bookmark === bookmark) {
          foundBookmark = bookmarkArray[i];

          logging.usersLogger.log({
            level: 'Info',
            message: `(bookmarks.js:findBookmark) Bookmark found for ${foundBookmark.character} ${foundBookmark.realm} ${foundBookmark.region}!`
          });

          break;
        }
      }
    }
  }
  catch (e) {
    logging.usersLogger.log({
      level: 'Warning',
      message: `(bookmarks.js:findBookmark) User ${user} not found.`
    });
  }

  logging.usersLogger.log({
    level: 'Info',
    message: `(bookmarks.js:findBookmark) Closing users database.`
  });

  db.close();

  return foundBookmark;
};

exports.findMain =  function(user) {
  var foundMain = undefined;
  logging.usersLogger.log({
    level: 'Info',
    message: `(bookmarks.js:findMain) Opening users database...`
  });
  db = new database('data/users.sqlite');
  try {
    logging.usersLogger.log({
      level: 'Info',
      message: `(bookmarks.js:findMain) Getting row for user ${user}...`
    });
    var row = db.prepare(`SELECT * FROM users WHERE userId = ?`).get(user);
    if (row) {

      var main = row.main;
      if (main != '') {
        bookmarkArray = JSON.parse(row.bookmarks);
        for (var i = 0; i < bookmarkArray.length; i++) {
          if (bookmarkArray[i].bookmark === main) {
            foundMain = bookmarkArray[i];

            logging.usersLogger.log({
              level: 'Info',
              message: `(bookmarks.js:findMain) Main bookmark found for ${foundMain.character} ${foundMain.realm} ${foundMain.region}!`
            });

            break;
          }
        }
      }
    }
  }
  catch (e) {
    logging.usersLogger.log({
      level: 'Warning',
      message: `(bookmarks.js:findMain) User ${user} not found.`
    });
  }
  logging.usersLogger.log({
    level: 'Info',
    message: `(bookmarks.js:findMain) Closing users database.`
  });
  db.close();

  return foundMain;
};
