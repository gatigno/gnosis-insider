const Botmaster = require('botmaster');

const botmaster = new Botmaster();

const TwitterBot = require('botmaster-twitter-dm');

const twitterSettings = {
  credentials: {
    consumerKey: 'bxnTSMG1hQxghepBJmQWKzVJ6',
    consumerSecret: 'RFu89xzSMz1OreFlumX385xXI1Dz0LwASqwxVMs5SPno5uiceD',
    accessToken: '874495304380362752-c8W3dukDtDaDofGpeyVtcM15gUg11Ei',
    accessTokenSecret: 'T8Ntim06BjTnZ8YjOXaGwQMVkpFot8clUqwtlgUdgXQcN',
  }
}

const twitterBot = new TwitterBot(twitterSettings);
botmaster.addBot(twitterBot);

botmaster.use({
  type: 'incoming',
  name: 'my-middleware',
  controller: (bot, update) => {
    return bot.reply(update, update.message.text);
  }
});
