const Botmaster = require('botmaster');
const TelegramBot = require('botmaster-telegram');
const SlackBot = require('botmaster-slack');
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

const slackSettings = {
  credentials: {
    clientId: config.get('slack.clientId'),
    clientSecret: config.get('slack.clientSecret'),
    verificationToken: config.get('slack.verificationToken')
  },
  webhookEndpoint: config.get('slack.webhookEndpoint'),
  storeTeamInfoInFile: true,
};

const slackBot = new SlackBot(slackSettings);
botmaster.addBot(slackBot);

// sending message to admin whenever bot restarts
telegramBot.sendMessage({
  recipient: {
    id: config.get('general.adminTelegramId'),
  },
  message: {
    text: 'bot restarted',
    quick_replies: []
  },
});

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
    if (questionOptionName == 'qPrediction') {
      flowMatrix.unshift('prediction');
    } else {
      flowMatrix.unshift(questionOptionName.replace('q', 'a'));
    }
    if (questionOptionName == 'END') {
      delete cacheData.telegram[update.sender.id];
    } else {
      cacheData.telegram[update.sender.id].apiData.flow = flowMatrix.join(';');
    }
    return message;
    // console.log(cacheData);
    // return bot.sendMessage(message);
  },

  processTypingMessage: function processTypingMessage(value, seconds, bot, update, questionOptions = [], callback) {
    setTimeout(function() {
      const outgoingMessage = bot.createOutgoingMessageFor(update.sender.id);
      outgoingMessage.addTypingOnSenderAction();
      bot.sendMessage(outgoingMessage);
    }, ((seconds * 2) - 1) * 1000);

    setTimeout(function() {
      const outgoingMessage1 = bot.createOutgoingMessageFor(update.sender.id);
      app.convertMarkup(value, update, function(returnText) {
        outgoingMessage1.addText(returnText);
        if (questionOptions.length > 0) {
          var options = [];
          questionOptions.forEach(function(value) {
            options.push({
              title: value
            });
          });
          outgoingMessage1.addQuickReplies(options);
        }
        bot.sendMessage(outgoingMessage1);
        callback();
      });

    }, (((seconds + 1) * 2) - 2) * 1000);

  },

  convertMarkup: function convertMarkup(text, update, callback) {
    if (text.match(/\[.+\]/g)) {
      var param = app.getRegexValue(/\[(.+)\]/g, text);
      switch (true) {
        case /fName/.test(param):
          callback(text.replace('[fName]', update.raw.message.from.first_name));
          break;
        case /promprt:.+/.test(param):
          callback(text.replace('[' + param + ']', ''));
          break;
        case /data:.+/.test(param):
          // return text.replace('[' + param + ']', '72%');
          const apiParams = (param.replace('data:', '')).split('/');
          const marketID = cacheData.telegram[update.sender.id].apiData.marketID;
          request({
            method: 'GET',
            uri: 'https://sheetsu.com/apis/v1.0/02eb4bdf06d4/sheets/' + apiParams.shift()
          }, function(error, response, body) {
            try {
              if (!error && response.statusCode == 200) {
                const fieldName = apiParams.shift();
                const apiParsedData = JSON.parse(body);
                for (const key in apiParsedData) {
                  if (apiParsedData[key].id == marketID || apiParsedData[key].marketID == marketID) {
                    callback(text.replace('[' + param + ']', apiParsedData[key][fieldName]));
                    break;
                  }
                }
              }
            } catch (ex) {
              console.log(ex);
            }
          });
          break;
        default:
          callback(text);
      }
    } else {
      callback(text);
    }
  },
  getRegexValue: function getRegexValue(regex, text) {
    let m;
    while ((m = regex.exec(text)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === regex.lastIndex) {
        regex.lastIndex++;
      }
      var param = m[1];
    }
    return param;
  },

  sendMessage: function sendMessage(flowMatrix, bot, update) {
    var messageText = cacheData.telegram[update.sender.id].apiData[flowMatrix.shift()].split('[typing]');
    var questionOptionName = flowMatrix.shift();
    if (questionOptionName == 'END') {
      var questionOptions = [];
    } else {
      var questionOptions = cacheData.telegram[update.sender.id].apiData[questionOptionName].split(';');
    }

    const callbackFunction = function() {
      if (questionOptionName == 'END') {
        delete cacheData.telegram[update.sender.id];
      }
    }

    for (const key in messageText) {
      intKey = parseInt(key);
      if (intKey + 1 == messageText.length) {
        app.processTypingMessage(messageText[key], intKey + 1, bot, update, questionOptions, callbackFunction);
      } else {
        app.processTypingMessage(messageText[key], intKey + 1, bot, update, [], callbackFunction);
      }
    };
    if (questionOptionName == 'qPrediction') {
      flowMatrix.unshift('prediction');
    } else {
      flowMatrix.unshift(questionOptionName.replace('q', 'a'));
    }
    cacheData.telegram[update.sender.id].apiData.flow = flowMatrix.join(';');
  }
}

botmaster.use({
  type: 'incoming',
  name: 'my-middleware',
  controller: (bot, update) => {
    // console.log(update);
    try {
      if (bot.type === 'telegram') {
        if (!(update.sender.id in cacheData.telegram)) {
          cacheData.telegram[update.sender.id] = {
            'sheet': false,
            'uuid': uuidv1()
          };
        }

        if (update.message.text.match(/\/start \d+/g)) {
          const regex = /\/start (\d+)/g;
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
            try {
              if (!error && response.statusCode == 200) {
                cacheData.telegram[update.sender.id].apiData = JSON.parse(body)[0];
                var flowMatrix = cacheData.telegram[update.sender.id].apiData.flow.split(';');
                app.sendMessage(flowMatrix, bot, update);
              }
            } catch (ex) {
              console.log(ex);
            }
          });

        } else {
          // Adds single row to sheet named "predictions"
          var flowMatrix = cacheData.telegram[update.sender.id].apiData.flow.split(';');
          // console.log(flowMatrix);
          var date = new Date(new Date().toLocaleString('en-US', {
            timeZone: 'Europe/Vilnius'
          }));
          if (cacheData.telegram[update.sender.id].sheet === false) {
            sheetsuClient.create({
              "marketID": cacheData.telegram[update.sender.id].apiData.marketID,
              "timestamp": (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(),
              "tgUsername": update.sender.id,
              "predictionID": cacheData.telegram[update.sender.id].uuid,
              [flowMatrix.shift()]: update.message.text
            }, "predictions").then(function(data) {
              cacheData.telegram[update.sender.id].sheet = true;

              request({
                method: 'GET',
                uri: 'https://sheetsu.com/apis/v1.0/02eb4bdf06d4/sheets/config'
              }, function(error, response, body) {
                try {
                  if (!error && response.statusCode == 200) {
                    const configFromSheet = JSON.parse(body)[0];
                    sheetsuClient.update(
                      "predictionID", // column name
                      cacheData.telegram[update.sender.id].uuid, // value to search for
                      {
                        "ethBet": configFromSheet['currentBet']
                      }, // hash with updates
                      false,
                      "predictions"
                    );
                  }
                } catch (ex) {
                  console.log(ex);
                }
              });

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
          app.sendMessage(flowMatrix, bot, update);
          // return bot.sendMessage(app.replyAfterFirstQuestion(update, flowMatrix));
        }
      } else if (bot.type === 'slack') {
        if(update.raw.event.user !== config.get('slack.botId')){
            if(update.message.text.indexOf(config.get('slack.botId')) !== -1){
                return bot.reply(update, 'Current prediction is that Agrello will raise $130M. \n This prediction was aggregated from 27 users in this channel, backed by a total of $1203.');
            }

        }
      }
    } catch (ex) {
      console.log(ex);
    }

  }
});
