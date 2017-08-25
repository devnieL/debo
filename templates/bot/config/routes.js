var async = require("async");
var Bot = require("./../Bot");

var WebChannelRouter = require("./channels/WebChannelRouter");
var FBChannelRouter = require("./channels/FBChannelRouter");

module.exports = function(server) {

	async.series([

		function(_cb) {

			async.each(Bot.channels, function(channel, cb) {

				if (!channel.enabled)
					return cb();

				switch (channel.name) {

					case "web":
						server.use("/api/channels/web", WebChannelRouter);
						console.log("Bot | Web channel is completely loaded and ready to start ...");
						cb();
						break;

					case "facebook":
						server.use("/api/channels/facebook", FBChannelRouter);
						console.log("Bot | Facebook channel is completely loaded and ready to start ...");
						cb();
						break;

					case "twitter":
						require("./channels/TwitterChannelRouter");
						console.log("Bot | Twitter channel is completely loaded and ready to start ...");
						cb();
						break;

					default:
						cb();

				}

			}, function(err) {
				if (err) _cb(err);
				_cb();
			});

		}

	], function(err) {
		if (err) console.error(err);
	});

}