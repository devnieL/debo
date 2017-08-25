var async = require('async');
var Conversation = require('./../models/Conversation');
var UserChannel = require('./../models/UserChannel');
var Conversations = require("./Conversations");
var Utils = require("./../../utils/Utils");
var request = require("request");
var Bot = require("./../../Bot");

/**
 * Webhook required for FB sync
 */

exports.webhook_get = function(req, res) {

	console.log("FB | FB.webhook_get ", req.query);

	if (req.query['hub.verify_token'] === process.env.FACEBOOK_VERIFY_TOKEN) {
		return res.send(req.query['hub.challenge']);
	}

	res.send('Error, wrong validation token');
};

/**
 * Webhook required for FB message exchanging
 */

exports.webhook_post = function(req, res) {

	console.log("FB | FB.webhook_post received, sending 200 status inmediately ... ");

	/** X-Hub Header Validation **/
	
	if(req.isXHub && req.isXHubValid())
		res.sendStatus(200);
	else
		return res.sendStatus(401);
	
	/** Process each message **/
	
	async.each(req.body.entry, function(entry, cb) {

		var messaging_events = entry.messaging;

		async.each(messaging_events, function(event, cb2) {

			var sender_id = event.sender.id;

			async.series([

				function(cb3){

					if (event.message || event.postback || (event.message && event.message.quick_reply && event.message.quick_reply.payload)) {

						request({
							url: 'https://graph.facebook.com/v2.6/me/messages',
							qs: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
							method: 'POST',
							json: {
								recipient: { id : sender_id },
								sender_action: "typing_on",
							}
						}, function(){
							cb3();
						});

					}else{

						cb3();

					}
					
				},

				function(cb3){

					// POSTBACK

					if (event.postback || (event.message && event.message.quick_reply && event.message.quick_reply.payload)) {

						var payload = (event.message && event.message.quick_reply && event.message.quick_reply.payload) ? event.message.quick_reply.payload : event.postback.payload;
						
						console.log("FB | FB.payload : ", payload);

						switch (payload) {
							case "NEW_CONVERSATION_PAYLOAD":
								Conversations.restartOrCreate(sender_id, Bot.channels.facebook, cb3);
								break;
							case (payload.match(/^NEW_INPUT_PAYLOAD:/) || {}).input:
								var data = Utils.decrypt(payload.split("NEW_INPUT_PAYLOAD:")[1]);
								Conversations.processInput(sender_id, Bot.channels.facebook,	data.input,	cb3);
								break;
						}

						return;

					}

					if (event.message) {

						console.log("FB | FB.message : ", event.message);

						async.waterfall([

							function(cb4) {
								UserChannel.getByRemoteIdAndChannelOrCreate(sender_id, Bot.channels.facebook, cb4);
							},

							function(user_channel, cb4) {

								var conversation = new Conversation({
									user_channel: user_channel
								});

								Conversation.getOrCreate(conversation, function(err, _conversation, _new_conversation) {
									if (err) return cb2(err);
									cb4(null, _conversation, _new_conversation);
								});
							},

							function(conversation, new_conversation, cb4) {

								if(event.message.attachments){
									// Don't handle other attachments
									cb4();
								}else{
									var input = event.message.text;
									conversation.converse(input, cb4);
								}

							}

						], function(err) {
							if (err) return cb3(err);
							cb3();
						});

						return;
					}

					cb3();

				}

			], function(err){

				request({
					url: 'https://graph.facebook.com/v2.6/me/messages',
					qs: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
					method: 'POST',
					json: {
						recipient: { id : sender_id },
						sender_action: "typing_off",
					}
				});

				cb2(err);

			});

		}, cb);

	}, function(err) {

		if (err) console.error(err);
		console.log(" ******* All fb messages were processed *******");

	});
	
};