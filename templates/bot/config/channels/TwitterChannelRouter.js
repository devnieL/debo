var express = require("express");
var Twit = require('twit');
var TwitterController = require("./../../app/controllers/Twitter");

var log = global.log.child({
    module : "config/channels/TwitterChannelRouter.js"
});

var T = new Twit({
  consumer_key:         process.env.TWITTER_API_KEY,
  consumer_secret:      process.env.TWITTER_API_SECRET,
  access_token:         process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000
});

var stream = global.twitter_stream = T.stream('user', { 
    with: 'user'
});

var onEvent = function(event){
    
    console.log("TWITTER | STREAMING DIRECT MESSAGE EVENT : ", event);
    var sender = event.direct_message.sender;

    if(sender.screen_name.toLowerCase() != process.env.TWITTER_SCREEN_NAME.toLowerCase()){

        console.log("Direct message : ", event.direct_message.text);

        const SID = sender.id_str;
        const TIMESTAMP = Date.now();

        TwitterController.onMessage(event.direct_message.text, SID);

    }

}

stream.on('connect', function(){

});

stream.on('disconnect', function (disconnectMessage) {

});

stream.on('direct_message', function(event) {
    onEvent(event);
});

stream.on('error', function(error) {
    stream.stop();
});
