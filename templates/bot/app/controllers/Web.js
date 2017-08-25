var async = require('async');
var Conversation = require('./../models/Conversation');
var UserChannel = require('./../models/UserChannel');
var Conversations = require("./Conversations");
var Utils = require("./../../utils/Utils");
var request = require("request");
var Bot = require("./../../Bot");

const uuidv1 = require('uuid/v1');

/**
 * Process a query message.
 * Similar to api.ai
 *
 */

exports.query = function(req, res) {

	console.log("Web | Web.query received, sending 200 status inmediately ... ");

    // TODO: Security

    // Session id, generated after the first interaction.
    var sid = req.body.sessionId || uuidv1();
    var query = req.body.query;
    var event = req.body.event;
    
    // Process query message
    if(query){

        process_Message(sid, query, function(err, response){

            if(err) return Utils.handleError(req, res, err);
            return res.json({
                data: {
                    messages : response
                }
            });

        });

    // Process event or action
    }else{

        process_Event(sid, event, function(err, response){

            if(err) return Utils.handleError(req, res, err);
            return res.json({
                data: {
                    response : response
                }
            });

        });

    }
	
};

exports.version = function(req, res){
    res.json({
        data : {
            version : process.env.VERSION
        }
    });
}

var process_Message = function(sid, message, callback){

    async.waterfall([
        
        function(cb) {

            UserChannel.getByRemoteIdAndChannelOrCreate(sid, Bot.channels.web, cb);

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

            var input = message;

            /*conversation.converse({
                input : input,
                from_bot : false,
                send_messages : false,
                onResponse: function(response){},
                onError: function(error){}
            })*/

            conversation.converse(input, function(err, messages){
                if(err) return callback(err);
                return callback(null, messages);
            }, false, false);

        }

    ], function(err, messages) {
        if (err) return callback(err);
        callback(null, messages);
    });

};

var process_Event = function(sid, event, callback){

    var payload = event.payload;
    
    switch (payload) {
        case "NEW_CONVERSATION_PAYLOAD":
            Conversations.restartOrCreate(sid, Bot.channels.web, callback);
            break;
        case (payload.match(/^NEW_INPUT_PAYLOAD:/) || {}).input:
            var data = Utils.decrypt(payload.split("NEW_INPUT_PAYLOAD:")[1]);
            Conversations.processInput(sid, Bot.channels.web, data.input, callback);
            break;
        default:
            callback();
    }

};
