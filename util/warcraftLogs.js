const util = require('util');

const characterUrl = 'https://www.warcraftlogs.com/character/%s/%s/%s';

exports.getCharacterUrl = function(character, realm, region) {
  return util.format(characterUrl, region, realm.replace(' ', '-'), character);
}
