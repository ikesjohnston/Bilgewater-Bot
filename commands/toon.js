const config = require('../config.json');
const blizzard = require('blizzard.js').initialize({ apikey: config.battlenet });
const database = require('better-sqlite3');
const util = require('util');
const common = require('..//util//common');
const logging = require('..//util//logging');
const battleNet = require('..//util//battleNet');
const raiderIo = require('..//util//raiderIo');
const warcraftLogs = require('..//util//warcraftLogs');
const bookmark = require('./bookmarks');

var character = '';
var realm = '';
var region = '';

/**
 * Processes the toon command
 * @param {Client} client The Discord cleint 
 * @param {Message} message The message sent in chat from the user
 * @param {String[]} args The series of arguments passed with the command
 */
exports.run = function(client, message, args) {
  // Used to log bot performance stats
  common.startDebugTimer(`toonRequest${message.author.id}`);

  var bBookmarkFound = false;
  var optionalArgsStartIndex = 1;

  var bGetCollections = false;
  var bGetProfessions = false;
  var bGetAchievements = false;
  var bGetFeed = false;
  var bGetMythicPlus = false;
  var bGetHelp = false;

  // Default to US if no bookmark found and no region specified
  region = 'us';

  var bRealmSpecified = false;
  var bRegionSpecified = false;

  // No arguments or only optional arguments? Check for main bookmark
  if (args.length === 0 || (args.length > 0 && args[0][0] === '-')) {
    var mainBookmarkValues = bookmark.findMain(message.author.id);
    if (mainBookmarkValues != undefined) {
      character = mainBookmarkValues.character;
      realm = mainBookmarkValues.realm;
      region = mainBookmarkValues.region;
      bBookmarkFound = true;
      optionalArgsStartIndex = 0;
    }
  }

  // At least one argument? Check if first arg is a valid bookmark
  if (args.length >= 1) {
    var bookmarkValues = bookmark.findBookmark(message.author.id, args[0]);
    if(bookmarkValues != undefined) {
      character = bookmarkValues.character;
      realm = bookmarkValues.realm;
      region = bookmarkValues.region;
      bBookmarkFound = true;
    }
  }

  // No bookmark found? Proceed as normal
  if (!bBookmarkFound) {
    if(args.length < 2) {
      sendUsageResponse(message);
      common.stopDebugTimer(`toonRequest${message.author.id}`);
      return;
    }
    optionalArgsStartIndex = 2;
    character = args[0];
    realm = args[1];
  }

  // Process optional arguments, only send one response type per request
  var responseTypeArgumentFound = false;
  for (var i = optionalArgsStartIndex; i < args.length; i++) {
    var arg = args[i].toLowerCase();
    if (arg === '-r') {
      if (i >= args.length - 1) {
        var errorMessage = `\`\`\`Region flag given but no region specified. Valid regions are us, eu, kr, and tw.\`\`\``;
        message.channel.send(errorMessage);
        common.stopDebugTimer(`toonRequest${message.author.id}`);
        return;
      }
      i++;
      if (!battleNet.isValidRegion(args[i], message)) {
        common.stopDebugTimer(`toonRequest${message.author.id}`);
        return;
      }
      region = args[i];
    } else 
    if (!responseTypeArgumentFound) {
      if (arg === '-c' || arg === '-collections') {
        bGetCollections = true;
        responseTypeArgumentFound = true;
      } else
      if ( arg === '-p' || arg === '-professions') {
        bGetProfessions = true;
        responseTypeArgumentFound = true;
      } else
      if ( arg === '-a' || arg === '-achievements') {
        bGetAchievements = true;
        responseTypeArgumentFound = true;
      } else
      if ( arg === '-f' || arg === '-feed') {
        bGetFeed = true;
        responseTypeArgumentFound = true;
      } else
      if ( arg === '-m' || arg === '-mythicplus') {
        bGetMythicPlus = true;
        responseTypeArgumentFound = true;
      }
      else
      if ( arg === '-h' || arg === '-help') {
        bGetHelp = true;
        responseTypeArgumentFound = true;
      }
    }
  }

  // Send appropriate response
  if (bGetCollections) {
    battleNet.sendCollectionsResponse(character, realm, region, message);
  } else
  if (bGetProfessions) {
    battleNet.sendProfessionsResponse(character, realm, region, message);
  } else
  if (bGetAchievements) {
    battleNet.sendAchievementsResponse(character, realm, region, message);
  } else
  if (bGetFeed) {
    battleNet.sendFeedResponse(character, realm, region, message);
  } else
  if (bGetMythicPlus) {
    raiderIo.sendMythicPlusResponse(character, realm, region, message);
  } else
  if (bGetHelp) {
    sendUsageResponse(message);
  } else {
    battleNet.sendCharacterResponse(character, realm, region, message);
  }
};

/**
 * Prints out command usage instructions in Discord
 * @param {Message} message The message sent in chat from the user
 */
function sendUsageResponse(message) {
  var usage = `\`\`\`Usage: \n\n${config.prefix}toon <character> <realm>\n-----------OR-----------\n${config.prefix}` +
    `toon <bookmark>\n\nOptional Arguments:\n\n-r <region>       Specify the character's region. Valid regions are us(*), eu, kr, and tw\n` +
    `-m, -mythicplus      Display mythic+ dungeon statistics for the character\n` +
    `-c, -collections     Display collection statistics for the character\n` +
    `-p, -professions     Display professions statistics for the character\n` +
    `-a, -achievements    Display achievement statistics for the character\n` +
    `-f, -feed  Display recent activity feed for the character\n` +
    `\n(*) = Default Value\n\nAdditional Info:\n\nMythic+ data is usually updated ` +
    `within the hour.\nAll other data is updated on logout.\`\`\``;
    message.channel.send(usage);
}
