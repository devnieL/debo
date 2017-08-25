var async = require('async');
var Conversation = require('./../models/Conversation');
var UserChannel = require('./../models/UserChannel');
var Conversations = require("./Conversations");
var Utils = require("./../../utils/Utils");
var request = require("request");
var Bot = require("./../../Bot");

function onMessage(message, sender){

    console.log("Twitter | Twitter.message received | input = ", message);

    var conversation = null;

    async.waterfall([

        function(cb) {

            UserChannel.getByRemoteIdAndChannelOrCreate(sender, Bot.channels.twitter, cb);

        },

        function(user_channel, cb) {

            var conversation = new Conversation({
                user_channel: user_channel
            });

            Conversation.getOrCreate(conversation, function(err, _conversation, _new_conversation) {
                if (err) return cb(err);
                cb(null, _conversation, _new_conversation);
            });

        },

        function(conversation, new_conversation, cb) {

            conversation.converse(message, cb);

        }

    ], function(err) {

        if(err) console.error(err);
        console.log("Message processed ...");

    });

}

/* exports.onMessage = function(req, res){
  onMessage(req.body.message, req.body.sender);
  return res.status(200).end();
} */

exports.onMessage = function(message, sender){
    onMessage(message, sender);
}