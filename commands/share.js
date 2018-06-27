var config = require('../config.json');

const common = require('..//util//common');

exports.run = function(client, message, args) {
  if(args.length < 1) {
    sendUsageResponse(message);
    return;
  }

  var messageId = args[0];
  var channels = client.channels.array();

  for(var channelIndex = 0; channelIndex < channels.length; channelIndex++) {
    var channel = channels[channelIndex];
    if(channel.type === 'dm' || channel.type === 'group' || channel.type === 'text') {
      channel.fetchMessage(messageId)
        .then(foundMessage => {
          if (foundMessage.content != '') {
            message.channel.send(foundMessage.content)
          }
          if(foundMessage.embeds && foundMessage.embeds.length > 0) {
            var foundEmbed = foundMessage.embeds[0];

            var author = null;
            var foundAuthor = foundEmbed.author;
            if(foundAuthor) {
              author = {
                name: foundAuthor.name,
                icon_url: foundAuthor.iconURL
              };
            }

            var thumbnail = null;
            var foundThumbnail = foundEmbed.thumbnail;
            if(foundThumbnail) {
              thumbnail = {
                url: foundThumbnail.url
              };
            }

            var fields = [];
            var foundEmbedFields = foundEmbed.fields;
            for (var fieldIndex = 0; fieldIndex < foundEmbedFields.length; fieldIndex ++) {
              var foundField = foundEmbedFields[fieldIndex];
              var field = {
                name: foundField.name,
                value: foundField.value
              };
              fields.push(field);
            }

            var footer = null;
            var foundFooter = foundEmbed.footer;
            if(foundFooter) {
              footer = {
                icon_url: foundFooter.iconURL,
                text: foundFooter.text
              };
            }

            var messageEmbed = common.buildEmbed(foundEmbed.color, foundEmbed.title, foundEmbed.url, author, thumbnail, fields, footer)
            message.channel.send({embed: messageEmbed});
          }
        })
        .catch();
    }
  }
};

function sendUsageResponse(message) {
  var usage = `\`\`\`Usage: \n\n${config.prefix}share <message id>\`\`\``;
  message.channel.send(usage);
  return;
}
