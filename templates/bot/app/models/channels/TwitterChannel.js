"use strict";

var request = require('request');
var async = require("async");
var moment = require("moment-timezone");
var Utils = require("./../../../utils/Utils");
var errors = require("./../../../utils/errors");

var Twit = require('twit');

var log = global.log.child({
    module : "models/channels/TwitterChannel.js"
});

var T = new Twit({
  consumer_key:         process.env.TWITTER_API_KEY,
  consumer_secret:      process.env.TWITTER_API_SECRET,
  access_token:         process.env.TWITTER_ACCESS_TOKEN_KEY,
  access_token_secret:  process.env.TWITTER_ACCESS_TOKEN_SECRET,
  timeout_ms:           60*1000
});

var MAX_TEXT_LENGTH = 140;

class TwitterChannel {

    /**
     * 
     * 
     * @static
     * @param {Message} message 
     * @param {Function} callback 
     * @memberof TwitterChannel
     */
    static send(message, callback){

        switch(message.type){

            case "text":

                if(message.content && message.content.length > MAX_TEXT_LENGTH){

                    var parts = [];
                    var content = message.content;
            
                    while(content.length > 0){
                        parts.push(content.substring(0, MAX_TEXT_LENGTH));
                        content = content.substring(MAX_TEXT_LENGTH, content.length);
                    }
                        
                    async.eachSeries(parts, function(part, cb){
                        
                        T.post('direct_messages/new', {
                            text: part,
                            user_id: message.conversation.user_channel.remote_id
                        },  cb);

                    }, callback);


                }else{

                    T.post('direct_messages/new', {
                        text: message.content,
                        user_id: message.conversation.user_channel.remote_id
                    },  callback);

                }

                break;

            case "options":

                async.eachSeries(self.data.options, function(option, cb){
                    
                    var text = [
                        option.title,
                        option.subtitle
                    ].join("\n");
        
                    var j = 0;
        
                    var otext = text;
        
                    async.retry({
                        times :  self.retries || TWITTER_RETRY_TIMES,
                        interval : TWITTER_TIMEOUT
                    }, function(_cb){
        
                    twitter.post('direct_messages/new', {
                        text: otext,
                        user_id: self.conversation.user_channel.remote_id
                    },  function(error, data) {
        
                        if(error){
                        async.series([
        
                            function(__cb){
        
                            console.log("Message.send() , Twitter | Getting message variation ...");
        
                            Utils.getVariation(text, function(err, variation){
                                if(err) {
                                console.log("Message.send(), Twitter | Error while getting message variation :", err);
                                return __cb(err);
                                }
        
                                otext = variation;
                                __cb();
                            });
                            }
        
                        ],function(){
        
                            console.log("Message.send() | type =", self.type, "| Recipient =", self.conversation.user_channel.remote_id, "| Message wasn't sent : error =", error, "| Retrying ...");
                            return _cb({
                            code : "TWITTER_ERROR",
                            message : "Ocurrió un error al enviar el mensaje."
                            });
        
                        });
        
                        return;
                        }
        
                        _cb();
                    });
        
                    }, function(err){
        
                    if(err) {
                        console.log("Message.send() | type =", self.type, "| Recipient =", self.conversation.user_channel.remote_id, "| Message wasn't sent : error =", err);
                        return cb(err);
                    }
        
                    console.log("Message.send() | type =", self.type, "| Recipient =", self.conversation.user_channel.remote_id, "| Message was sent ");
                    cb();
                    });
        
                }, function(err){
                    if(err) return callback(err);
                    callback();
                });

                break;
        }
        

    }

}

module.exports = TwitterChannel;