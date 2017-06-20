const Botmaster = require('botmaster');
const TelegramBot = require('botmaster-telegram');
const TwitterBot = require('botmaster-twitter-dm');
const request = require('request');
const botmaster = new Botmaster();



// const twitterSettings = {
//   credentials: {
//     consumerKey: 'bxnTSMG1hQxghepBJmQWKzVJ6',
//     consumerSecret: 'RFu89xzSMz1OreFlumX385xXI1Dz0LwASqwxVMs5SPno5uiceD',
//     accessToken: '874495304380362752-c8W3dukDtDaDofGpeyVtcM15gUg11Ei',
//     accessTokenSecret: 'T8Ntim06BjTnZ8YjOXaGwQMVkpFot8clUqwtlgUdgXQcN',
//   }
// }
//
// const twitterBot = new TwitterBot(twitterSettings);
// botmaster.addBot(twitterBot);


const telegramSettings = {
  credentials: {
    authToken: '378448645:AAF0q3tO6f9Avxmc2xqHyQjf7Dvj-EisbRc',
  },
  webhookEndpoint: '/webhook1234/',
};

const telegramBot = new TelegramBot(telegramSettings);
botmaster.addBot(telegramBot);



var cacheData = {
  'telegram': {}
};
botmaster.use({
  type: 'incoming',
  name: 'my-middleware',
  controller: (bot, update) => {
    if (bot.type === 'telegram') {
      if (!(update.sender.id in cacheData.telegram)) {
        cacheData.telegram[update.sender.id] = [];
      }
      var arrayForCache = {
        'text': update.message.text,
        'seq': update.message.seq
      };

      if (update.message.text.match(/\/start \d/g)) {
        const regex = /\/start (\d)/g;
        let m;

        while ((m = regex.exec(update.message.text)) !== null) {
          // This is necessary to avoid infinite loops with zero-width matches
          if (m.index === regex.lastIndex) {
            regex.lastIndex++;
          }
          var marketId = m[1];
        }

        request({
          method: 'GET',
          uri: 'https://sheetsu.com/apis/v1.0/02eb4bdf06d4/sheets/bot/search?marketID=' + marketId
        }, function(error, response, body) {
          if (!error && response.statusCode == 200) {
            arrayForCache.apiData = JSON.parse(body)[0];
            cacheData.telegram[update.sender.id].push(arrayForCache);
            var flowMatrix = arrayForCache.apiData.flow.split(';');
            var questionOptions = arrayForCache.apiData[flowMatrix[1]].split(';');

            var message = {
              recipient: {
                id: update.sender.id,
              },
              message: {
                text: arrayForCache.apiData[flowMatrix[0]],
                quick_replies: []
              },
            };
            questionOptions.forEach(function(value) {
              message.message.quick_replies.push({
                title: value
              });
            });

            return bot.sendMessage(message);
            // return bot.reply(update, arrayForCache.apiData[flowMatrix[0]]);
          }
        });

      } else {

      }
    }
    // return bot.reply(update, update.message.text);
  }
});
