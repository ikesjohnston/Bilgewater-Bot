var logging = require('..//util//logging');

var amount = {
    "Potion of Prolonged Power": 10,
    "Aethril": 10,
    "Fjarnskaggl": 10,
    "Dreamleaf": 10,
    "Starlight Rose": 3,
    "Black Barracuda": 10,
    "Foxflower": 10,
    "Arkhana": 10,
    "Highmountain Salmon": 10,
    "Runescale Koi": 10,
    "Fatty Bearsteak": 10,
    "Stormray": 10,
    "Leylight Shard": 3,
    "Felslate": 5,
    "Leystone Ore": 10,
    "Stormscale": 10,
    "Mossgill Perch": 10,
    "Big Gamy Ribs": 10,
    "Shal'dorei Silk": 10,
    "Stonehide Leather": 10,
    "Leyblood": 10,
    "Cursed Queen Fish": 10,
    "Lean Shank": 10,
    "Wildfowl Egg": 10,
    "Unbroken Tooth": 20
};

var prices = {
    "Potion of Prolonged Power": 0,
    "Aethril": 0,
    "Fjarnskaggl": 0,
    "Dreamleaf": 0,
    "Starlight Rose": 0,
    "Black Barracuda": 0,
    "Foxflower": 0,
    "Arkhana": 0,
    "Highmountain Salmon": 0,
    "Runescale Koi": 0,
    "Fatty Bearsteak": 0,
    "Stormray": 0,
    "Leylight Shard": 0,
    "Felslate": 0,
    "Leystone Ore": 0,
    "Stormscale": 0,
    "Mossgill Perch": 0,
    "Big Gamy Ribs": 0,
    "Shal'dorei Silk": 0,
    "Stonehide Leather": 0,
    "Leyblood": 0,
    "Cursed Queen Fish": 0,
    "Lean Shank": 0,
    "Wildfowl Egg": 0,
    "Unbroken Tooth": 0
};

var primalAmounts = {
  "Empyrium": 10,
  "Astral Glory": 10,
  "Primal Obliterum": 1, // Requires Obliterum
  "Lightsphene": .1,
  "Argulite": .1,
  "Chemirine": .1,
  "Lightweave Cloth": 10,
  "Labradorite": .1,
  "Florid Malachite": .1,
  "Hesselian": .1,
  "Fiendish Leather": 10
};

var primalPrices = {
  "Empyrium": 0,
  "Astral Glory": 0,
  "Primal Obliterum": 0,
  "Lightsphene": 0,
  "Argulite": 0,
  "Chemirine": 0,
  "Lightweave Cloth": 0,
  "Labradorite": 0,
  "Florid Malachite": 0,
  "Hesselian": 0,
  "Fiendish Leather": 0
};

exports.run = function(client, message, args) {
  message.reply("sorry, this command is currently inactive due to Blizzard API changes.");
  return;
};
