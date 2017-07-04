const Botmaster = require('botmaster');
const TelegramBot = require('botmaster-telegram');
const config = require('config');
const request = require('request');
const sheetsu = require('sheetsu-node');
const cron = require('node-cron');

const telegramSettings = {
  credentials: {
    authToken: config.get('telegram.authToken'),
  },
  webhookEndpoint: config.get('telegram.webhookEndpoint'),
};

const telegramBot = new TelegramBot(telegramSettings);

// create a sheetsu config file
const sheetsuConfig = {
  address: config.get('sheetsu.sheetAddress'),
};
// Create new client
const sheetsuClient = sheetsu(sheetsuConfig);

cron.schedule('* * * * *', function(){
  request({
    method: 'GET',
    uri: 'https://sheetsu.com/apis/v1.0/02eb4bdf06d4/sheets/notifications/search?status=pending'
  }, function(error, response, body) {
    try {
      if (!error && response.statusCode == 200) {
        JSON.parse(body).forEach(function(value){
          telegramBot.sendMessage({
            recipient: {
              id: value.tgUserID,
            },
            message: {
              text: value.message
            },
          }).then(function(data){
            var date = new Date();
            sheetsuClient.update(
              "notificationID", // column name
              value.notificationID, // value to search for
              {
                "status": "sent",
                "deliveryTimestamp" : (date.getMonth() + 1) + "/" + date.getDate() + "/" + date.getFullYear() + " " + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds()
              }, // hash with updates
              false,
              "notifications"
            );
          });
        });
      }
    } catch (ex) {
      console.log(ex);
    }
  });
});
