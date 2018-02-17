exports.bilgewaterIconUrl = 'https://i.imgur.com/zjBxppj.png';

exports.capitalizeFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

exports.capitalizeAllFirstLetters = function(string) {
    var words = string.split(' ');
    for (var i = 0; i < words.length; i++) {
      words[i] = exports.capitalizeFirstLetter(words[i]);
    }

    return words.join(' ');
};

exports.formatNumberLength = function(number, length) {
    var numberString = "" + number;
    while (numberString.length < length) {
        numberString = "0" + numberString;
    }
    return numberString;
};

exports.msToTime = function(duration) {
  var seconds = parseInt((duration/1000)%60);
  var minutes = parseInt((duration/(1000*60))%60);

  seconds = (seconds < 10) ? '0' + seconds : seconds;

  return minutes + 'm ' + seconds + 's';
};

exports.getRandomIntInclusive = function(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min; //The maximum is inclusive and the minimum is inclusive
};

exports.buildEmbed = function(embedColor, embedTitle, embedUrl, embedAuthor, embedThumbnail, embedFields, embedFooter) {
  var embed = {};

  if (embedColor)
    embed.color = embedColor;
  if(embedTitle)
    embed.title = embedTitle;
  if(embedUrl)
    embed.url = embedUrl;
  if(embedAuthor)
    embed.author = embedAuthor;
  if(embedThumbnail)
    embed.thumbnail = embedThumbnail;
  if(embedFields)
    embed.fields = embedFields;
  if(embedFooter)
    embed.footer = embedFooter;

  return embed;
}
