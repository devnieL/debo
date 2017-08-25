"use strict";

var request = require('request');
var async = require("async");
var moment = require("moment-timezone");
var Utils = require("./../../../utils/Utils");
var errors = require("./../../../utils/errors");

var MAX_TEXT_LENGTH = 640;

class FacebookChannel {

    /**
     * 
     * 
     * @static
     * @param {Message} message 
     * @param {Function} callback 
     * @memberof WebChannel
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
                        
                        request({
                            url: 'https://graph.facebook.com/v2.6/me/messages',
                            qs: { 
                                access_token: process.env.FACEBOOK_ACCESS_TOKEN 
                            },
                            method: 'POST',
                            json: {
                                recipient: { 
                                    id : message.conversation.user_channel.remote_id 
                                },
                                message: {
                                    text : part
                                },
                            }
                        }, function(error, response, body) {

                            console.log("FacebookChannel.send() | type =", message.type, "| Recipient =", message.conversation.user_channel.remote_id, "| Message was sent, results : error =", error, " , body =", body);
                            
                            if(error) return cb(error);
                            if(body && body.error) return cb(body.error);
                            cb();

                        });

                    }, callback);

                }else{
                
                    request({
                        url: 'https://graph.facebook.com/v2.6/me/messages',
                        qs: { 
                            access_token: process.env.FACEBOOK_ACCESS_TOKEN 
                        },
                        method: 'POST',
                        json: {
                            recipient: { 
                                id : message.conversation.user_channel.remote_id 
                            },
                            message: {
                                text : message.content
                            },
                        }
                    }, function(error, response, body) {

                        console.log("FacebookChannel.send() | type =", message.type, "| Recipient =", message.conversation.user_channel.remote_id, "| Message was sent, results : error =", error, " , body =", body);
                        
                        if(error) return callback(error);
                        if(body && body.error) return callback(body.error);
                        callback();
                        
                    });

                }

                break;

            case "options":

                var options = [];
                
                for(var i in message.data.options){
        
                    options.push({
                        "title": message.data.options[i].title,
                        "subtitle" : message.data.options[i].subtitle,
                        "image_url": message.data.options[i].image,
                        "buttons": message.data.options[i].buttons
                    });
        
                }
        
                var parts = [];
                var opts = options;
        
                while(opts.length > 0){
                    parts.push(opts.splice(0, 10));
                }
        
                var i = 1;
        
                async.eachSeries(parts, function(part, cb){
        
                    console.log("Message.send() | Recipient =", message.conversation.user_channel.remote_id, "Sending message (" + i + "/" + parts.length + ") ..");
                    i+=1;
        
                    request({
                        url: 'https://graph.facebook.com/v2.6/me/messages',
                        qs: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
                        method: 'POST',
                        json: {
                            recipient: { id : message.conversation.user_channel.remote_id },
                            "message":{
                                "attachment":{
                                    "type":"template",
                                    "payload":{
                                    "template_type":"generic",
                                    "elements": part
                                    }
                                }
                            }
                        }
                    }, function(error, response, body) {
                        console.log("Message.send() | type =", message.type, "| Recipient =", message.conversation.user_channel.remote_id, "| Message was sent, results : error =", error, " , body =", body);
                        if(error) return cb(error);
        
                        if(body && body.error){
                            Utils.log(body.error, "ENGINE - Facebook Messenger Platform API", AlertSeverityTypes.MINOR);
                            return cb(body.error);
                        }
        
                        cb();
                    });
        
                }, function(err){
                    if(err) {
                        Utils.log(err, "ENGINE - Facebook Messenger Platform API", AlertSeverityTypes.MINOR);
                        return callback(err);
                    }
        
                    callback();
                    
                });

                break;

        }
        
    }

}

module.exports = FacebookChannel;