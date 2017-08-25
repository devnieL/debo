"use strict";

var User = require("./../models/User");
var UserChannel = require("./../models/UserChannel");

var errors = require("./../../utils/errors");
var Utils = require("./../../utils/Utils");

var validator = require("validator");
var async = require("async");

module.exports = class Users {

	/**
	 * GET /users/:id
	 * @param  {Object} req
	 * @param  {Object} res
	 * @return {undefined}
	 */
	static read(req, res) {

		console.log("Users.read() ", req.params.id);

		if(!validator.isInt(req.params.id))
			return Utils.handleError(req, res, errors.users.INVALID_ID, 400);

		var data = {};

		async.waterfall([

			function(cb){
				User.getById(req.params.id, function(err, user){
					if(err) return cb(err);
					data = user.toJSON();
					cb(null, user);
				});
			},

			function(user, cb){
				UserChannel.getByUser(user, function(err, ucs){
					if(err) return cb(err);

					var channels = {
						"twitter" : [],
						"facebook" : []
					};

					for(var i in ucs){
						channels[ucs[i].channel.name].push(ucs[i].metadata);
					}

					data.channels = channels;
					cb(null);

				});
			}

		], function(err){
			if(err) return Utils.handleError(req, res, err);
			res.send(data);
		});

	}

	/**
	 * PUT /users/:id
	 * @param  {Object} req
	 * @param  {Object} res
	 * @return {undefined}
	 */
	static update(req, res) {

		console.log("Users.update()");

		// Update user data, except credentials ...
		// Nothing by now.
		// Password update is done trough Auth

		console.log("req.body : ", req.body);

		if(!validator.isInt(req.params.id)){
			var error = new Error(errors.users.INVALID_ID);
			return Utils.handleError(req, res, error, 400);
		}

		if(!req.body){
			var error = new Error(errors.users.INVALID_DATA);
			return Utils.handleError(req, res, error, 500);
		}

		var data = req.body;

		User.getById(req.params.id, function(err, user){
			if(err) return Utils.handleError(req, res, err);
			user.enabled = (data.enabled != null) ? data.enabled : user.enabled;
			user.save(function(err){
				if(err) return Utils.handleError(req, res, err);
				return Users.read(req, res);
			})
		});
		
	}

	/**
	 * DELETE /users/:id
	 * @param  {Object} req
	 * @param  {Object} res
	 * @return {undefined}
	 */
	static delete(req, res) {

		console.log("Users.delete()");

		if(!validator.isInt(req.params.id)){
			var error = new Error(errors.users.INVALID_ID);
			return Utils.handleError(req, res, error, 400);
		}

		User.delete(req.params.id, function(error){
			if(error) return Utils.handleError(req, res, error);
			res.status(200).end();
		});

	}

};