var Channel = require("./../models/Channel");

var Utils = require("./../../utils/Utils");
var errors = require("./../../utils/errors");
var Error = require("./../../utils/BError");

var validator = require("validator");
var async = require("async");

module.exports = {

	/**
	 * GET /channels/:id
	 * @param  {Object} req
	 * @param  {Object} res
	 * @return {undefined}
	 */
	read: function (req, res, next) {

		console.log("Channels.read() ", req.params.id);

		if(!validator.isInt(req.params.id)){
			var error = new Error(errors.channels.INVALID_ID);
			return Utils.handleError(req, res, error, 400);
		}

		Channel.getById(req.params.id, function(err, channel){
			if(err) return Utils.handleError(req, res, err, 404);
			res.json(channel.toJSON());
		});

	},

	/**
	 * PUT /channels/:id
	 * @param  {Object} req
	 * @param  {Object} res
	 * @return {undefined}
	 */
	update: function (req, res, next) {

		console.log("Channels.update");

		console.log("req.body : ", req.body);

		if(!validator.isInt(req.params.id)){
			var error = new Error(errors.channels.INVALID_ID);
			return Utils.handleError(req, res, error, 400);
		}

		if(!req.body){
			var error = new Error(errors.channels.INVALID_DATA);
			return Utils.handleError(req, res, error, 500);
		}

		var data = req.body;

		Channel.getById(req.params.id, function(err, channel){
			if(err) return Utils.handleError(req, res, err);
			channel.enabled = (data.enabled != null) ? data.enabled : channel.enabled;
			channel.save(function(err){
				if(err) return Utils.handleError(req, res, err);
				res.json(channel.toJSON());
			})
		});
		

	},

	/**
	 * DELETE /channels/:id
	 * @param  {Object} req
	 * @param  {Object} res
	 * @return {undefined}
	 */
	delete: function (req, res, next) {

		console.log("Channels.delete");

		if(!validator.isInt(req.params.id)){
			var error = new Error(errors.channels.INVALID_ID);
			return Utils.handleError(req, res, error, 400);
		}

		Channel.delete(req.params.id, function(error){
			if(error) return Utils.handleError(req, res, error);
			res.status(200).end();
		});

	},

	/**
	 * GET /channels
	 * @param  {Object} req
	 * @param  {Object} res
	 * @return {undefined}
	 */
	list: function(req, res, next){

		console.log("Channels.list ()", req.query);

		var page = req.query.page || 0;
		var quantity = req.query.quantity || 20;

		if(!validator.isInt(page.toString())){
			var error = new Error(errors.channels.INVALID_PAGE);
			return Utils.handleError(req, res, error, 400);
		}

		if(!validator.isInt(quantity.toString())){
			var error = new Error(errors.channels.INVALID_QUANTITY);
			return Utils.handleError(req, res, error, 400);
		}

		async.waterfall([

			function(cb){

				Channel.list(page, quantity, function(error, idcs){
					if(error) return cb(error);
					idcs = idcs.map(function(idc){
						return idc.toJSON();
					});
					return cb(null, idcs);
				});
			},

			function(idcs, cb){

				var response = {
					page : page,
					quantity : quantity,
					data : idcs
				};

				Channel.count(function(err, total){
					if(err) return cb(err);
					response.total = total;
					cb(null, response);
				});

			}

		], function(err, response){
			if(error) return Utils.handleError(req, res, error);
			console.log("Response :", response);
			res.json(response);
		});

	},

	/**
	 * GET /channels/count
	 * @param  {Object} req
	 * @param  {Object} res
	 * @return {undefined}
	 */
	count: function (req, res, next) {

		console.log("Channels.count");

		Channel.count(function(error, total){
			if(error) return Utils.handleError(req, res, error);
			console.log("Channels.count results : ", total);
			res.json({
				total : total
			});
		});

	}

};