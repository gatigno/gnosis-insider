const Botmaster = require('botmaster');
const TelegramBot = require('botmaster-telegram');
const request = require('request');
const sheetsu = require('sheetsu-node');
const config = require('config');
const uuidv1 = require('uuid/v1');
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

var app = {
  replyAfterFirstQuestion: function replyAfterFirstQuestion(update, flowMatrix) {

    var messageText = cacheData.telegram[update.sender.id].apiData[flowMatrix.shift()];
    var questionOptionName = flowMatrix.shift();
    if (questionOptionName == 'END') {
      var questionOptions = [];
    } else {
      var questionOptions = cacheData.telegram[update.sender.id].apiData[questionOptionName].split(';');
    }
    var message = {
      recipient: {
        id: update.sender.id,
      },
      message: {
        text: messageText,
        quick_replies: []
      },
    };
    questionOptions.forEach(function(value) {
      message.message.quick_replies.push({
        title: value
      });
    });
    flowMatrix.unshift(questionOptionName.replace('q', 'a'));
    if (questionOptionName == 'END') {
      delete cacheData.telegram[update.sender.id];
    } else {
      cacheData.telegram[update.sender.id].apiData.flow = flowMatrix.join(';');
    }
    return message;
    // console.log(cacheData);
    // return bot.sendMessage(message);
  }
}

botmaster.use({
  type: 'incoming',
  name: 'my-middleware',
  controller: (bot, update) => {
    // console.log(update);
    if (bot.type === 'telegram') {
      if (!(update.sender.id in cacheData.telegram)) {
        cacheData.telegram[update.sender.id] = {
          'sheet': false,
          'uuid': uuidv1()
        };
      }


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
            var messageText = cacheData.telegram[update.sender.id].apiData[flowMatrix.shift()];
            var questionOptions = cacheData.telegram[update.sender.id].apiData[flowMatrix.shift()].split(';');
            var message = {
              recipient: {
                id: update.sender.id,
              },
              message: {
                text: messageText,
                quick_replies: []
              },
            };
            questionOptions.forEach(function(value) {
              message.message.quick_replies.push({
                title: value
              });
            });
            flowMatrix.unshift('prediction');
            cacheData.telegram[update.sender.id].apiData.flow = flowMatrix.join(';');
            return bot.sendMessage(message);
          }
        });

      } else {
        // Adds single row to sheet named "predictions"
        var flowMatrix = cacheData.telegram[update.sender.id].apiData.flow.split(';');
        // console.log(flowMatrix);
        var date = new Date(update.timestamp);
        if (cacheData.telegram[update.sender.id].sheet === false) {
          sheetsuClient.create({
            "marketID": cacheData.telegram[update.sender.id].apiData.marketID,
            "timestamp": (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(),
            "tgUsername": update.sender.id,
            "predictionID": cacheData.telegram[update.sender.id].uuid,
            [flowMatrix.shift()]: update.message.text
          }, "predictions").then(function(data) {
            cacheData.telegram[update.sender.id].sheet = true;
          }, function(err) {
            console.log(err);
          });
        } else {
          sheetsuClient.update(
            "predictionID", // column name
            cacheData.telegram[update.sender.id].uuid, // value to search for
            {
              [flowMatrix.shift()]: update.message.text
            }, // hash with updates
            false,
            "predictions"
          ).then(function(data) {
            // console.log(data);
          }, function(err) {
            console.log(err);
          });
        }
        return bot.sendMessage(app.replyAfterFirstQuestion(update, flowMatrix));
      }
    }
  }
});
