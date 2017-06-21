const Botmaster = require('botmaster');
const TelegramBot = require('botmaster-telegram');
const request = require('request');
const sheetsu = require('sheetsu-node');
const config = require('config');
const botmaster = new Botmaster();

// create a sheetsu config file
const sheetsuConfig = {
  address: config.get('sheetsu.sheetAddress'),
};
// Create new client
const sheetsuClient = sheetsu(sheetsuConfig);

const telegramSettings = {
  credentials: {
    authToken: config.get('telegram.authToken'),
  },
  webhookEndpoint: config.get('telegram.webhookEndpoint'),
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
        cacheData.telegram[update.sender.id] = {};
      }
      cacheData.telegram[update.sender.id].text = update.message.text;
      cacheData.telegram[update.sender.id].seq = update.message.seq;

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
            cacheData.telegram[update.sender.id].apiData = JSON.parse(body)[0];
            var flowMatrix = cacheData.telegram[update.sender.id].apiData.flow.split(';');
            var questionOptions = cacheData.telegram[update.sender.id].apiData[flowMatrix[1]].split(';');
            var message = {
              recipient: {
                id: update.sender.id,
              },
              message: {
                text: cacheData.telegram[update.sender.id].apiData[flowMatrix[0]],
                quick_replies: []
              },
            };
            questionOptions.forEach(function(value) {
              message.message.quick_replies.push({
                title: value
              });
            });

            return bot.sendMessage(message);
          }
        });

      } else {
        // Adds single row to sheet named "predictions"
        var date = new Date(update.timestamp);
        sheetsuClient.create({
          "marketID": cacheData.telegram[update.sender.id].apiData.marketID,
          "timestamp": (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(),
          "userID": "",
          "prediction": update.message.text
        }, "predictions").then(function(data) {
          // console.log(data);
        }, function(err) {
          console.log(err);
        });
      }
    }
  }
});
