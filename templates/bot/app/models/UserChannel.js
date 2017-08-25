"use strict";

var Bot = require("./../../Bot");
var request = require('request');
var errors = require("./../../utils/errors");
var async = require('async');
var Utils = require("./../../utils/Utils");

var log = global.log.child({
  module : "models/UserChannel.js"
});

module.exports = class UserChannel {

  constructor(data){

    this._id = data.id;
    this._user = data.user;
    this._channel = data.channel;
    this._metadata = data.metadata;

    // The user id in the channel environment
    this._remote_id = data.remote_id;

    this._state = (data.state != null) ? data.state : {
      accepted_terms : false
    }

    this._active = (data.active != null) ? data.active : true;
  }

  set id(value){
    this._id = value;
  }

  get id(){
    return this._id;
  }

  set active(value){
    this._active = value;
  }

  get active(){
    return this._active;
  }

  set user(value){
    this._user = value;
  }

  get user(){
    return this._user;
  }

  set channel(value){
    this._channel = value;
  }

  get channel(){
    return this._channel;
  }

  set remote_id(value){
    this._remote_id = value;
  }

  get remote_id(){
    return this._remote_id;
  }

  set metadata(value){
    this._metadata = value;
  }

  get metadata(){
    return this._metadata;
  }

  set state(value){
    this._state = value;
  }

  get state(){
    return this._state;
  }

  toJSON(){

    try{
      return {
        id : this.id,
        user : (this.user) ? this.user.toJSON() : null,
        channel : (this.channel) ? this.channel.toJSON() : null,
        metadata : this.metadata,
        remote_id : this.remote_id,
        state : this.state
      }
    }catch(e){
      return {
        id : this.id,
        user : (this.user) ? this.user.toJSON() : null,
        channel : this.channel,
        metadata : this.metadata,
        remote_id : this.remote_id,
        state : this.state
      }
    }

  }

  save(callback){

    var self = this;

    if(self.id != null)
      return self.update(callback);

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "INSERT INTO bot.user_channel (user_id, channel_id, remote_id, metadata, active, state) values ($1::int, $2::int, $3, $4, $5, $6) RETURNING *"
      ].join("\n");

      client.query(query, [self.user.id, self.channel.id, self.remote_id, self.metadata, self.active, self.state], function (err, result) {
        done();

        if (err) return callback(err);

        result = result.rows[0];
        self.id = result.id;
        self.metadata = result.metadata;
        callback(null, self);

      });
    });

  }

  update(callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "UPDATE bot.user_channel SET user_id = $2, metadata = $3, active = $4, state = $5 WHERE id = $1 RETURNING *"
      ].join("\n");

      client.query(query, [self.id, self.user.id, self.metadata, self.active, self.state], function (err, result) {
        done();

        if (err) {
          console.log("UserChannel.update() , (err,result) : ", err, result);
          return callback(err);
        }

        result = result.rows[0];
        self.metadata = result.metadata;
        callback(null, self);

      });
    });

  }

  delete(callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "DELETE FROM bot.user_channel WHERE id = $1"
      ].join("\n");

      client.query(query, [self.id], function (err, result) {
        done();

        if(err) return callback(err);
        self.id = null;
        callback(null, self);
      });
    });

  }

  static getByUser(user, callback){

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT uc.id, 
        uc.remote_id, 
        uc.state,
        uc.active,
        
        u.name as user_name, 
        u.id as user_id, 
        u.birth_date as user_birth_date,
        u.registered as user_registered,
        u.gender as user_gender,
        u.segment as user_segment,
        u.role as user_role,

        uc.metadata, 
        c.id as channel_id, 
        c.name as channel_name FROM bot.user_channel uc
        JOIN bot.channel c ON uc.channel_id = c.id
        JOIN bot.user u ON uc.user_id = u.id
        WHERE uc.user_id = $1
      `;

      client.query(query, [user.id], function (err, result) {

        //console.log("UserChannel.getByUser() : (err,result) : ", err, result);
        done();

        if (err) return callback(err);

        //if(result.rows.length == 0){
        //  var error = new BError(errors.user_channels.NOT_FOUND);
        //  return callback(error);
        //}

        async.map(result.rows, function(row, cb){
          var user_channel = UserChannel.fromRow(row);
          cb(null, user_channel);
        }, function(err, ucs){
          if(err) return callback(err);
          //console.log("UserChannel.getByUser()", ucs);
          callback(null, ucs);
        });

      });
    });

  }

  static getByUserId(uid, callback){

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT uc.id, 
        uc.remote_id, 
        
        u.name as user_name, 
        u.id as user_id, 
        u.birth_date as user_birth_date,
        u.registered as user_registered,
        u.gender as user_gender,
        u.segment as user_segment,
        u.role as user_role,

        uc.metadata,
        uc.state,
        uc.active,
        c.id as channel_id, 
        c.name as channel_name FROM bot.user_channel uc
        JOIN bot.channel c ON uc.channel_id = c.id
        JOIN bot.user u ON uc.user_id = u.id
        WHERE uc.user_id = $1
      `;

      client.query(query, [uid], function (err, result) {
        done();

        if (err) return callback(err);

        async.map(result.rows, function(row, cb){
          var user_channel = UserChannel.fromRow(row);
          cb(null, user_channel);
        }, function(err, ucs){
          if(err) return callback(err);
          //console.log("UserChannel.getByUser()", ucs);
          callback(null, ucs);
        });

      });
    });

  }

  static getById(id, callback){

    console.log("UserChannel.getById() , arguments : ", arguments);

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT 
          uc.id, 
          uc.remote_id, 
          uc.state,
          uc.metadata, 
          uc.active,
          
          u.name as user_name, 
          u.id as user_id, 
          u.birth_date as user_birth_date,
          u.registered as user_registered,
          u.gender as user_gender,
          u.segment as user_segment,
          u.role as user_role,
          
          c.id as channel_id, 
          c.name as channel_name ,
          idc.code as user_identity_document , 
          idc.type as user_identity_document_type 
        FROM bot.user_channel uc
        JOIN bot.channel c ON uc.channel_id = c.id
        JOIN bot.user u ON uc.user_id = u.id
        LEFT JOIN bot.user_identity_document uid on uid.user_id = u.id
        LEFT JOIN bot.identity_document idc on uid.identity_document_id = idc.id
        WHERE uc.id = $1
      `;

      client.query(query, [id], function (err, result) {

        console.log("UserChannel.getById() : (err,result) : ", err, result);
        done();

        if (err) return callback(err);

        if(result.rows.length == 0){
          return callback(errors.user_channels.NOT_FOUND);
        }

        var user_channel = UserChannel.fromRow(result.rows[0]);
        console.log("UserChannel.getById()", user_channel);
        return callback(null, user_channel);

      });
    });

  }

  static getByUserAndChannel(user, channel, callback){

    //console.log("UserChannel.getByUserAndChannel() , arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT 
        uc.id,
        uc.remote_id,
        uc.state,
        uc.metadata,
        uc.active,
        
        u.name as user_name, 
        u.id as user_id, 
        u.birth_date as user_birth_date,
        u.registered as user_registered,
        u.gender as user_gender,
        u.segment as user_segment,
        u.role as user_role,

        c.id as channel_id,
        c.name as channel_name FROM bot.user_channel uc
        JOIN bot.channel c ON uc.channel_id = c.id
        JOIN bot.user u ON uc.user_id = u.id
        WHERE uc.user_id = $1 AND uc.channel_id = $2
      `;

      client.query(query, [user.id, channel.id], function (err, result) {

        //console.log("UserChannel.getByUserAndChannel() : (err,result) : ", err, result);
        done();

        if (err) return callback(err);

        if(result.rows.length == 0){
          return callback(errors.user_channels.NOT_FOUND);
        }

        var user_channel = UserChannel.fromRow(result.rows[0]);
        callback(null, user_channel);

      });
    });

  }

  static getByRemoteIdAndChannel(remote_id, channel, callback){

    //console.log("UserChannel.getByRemoteIdAndChannel() , arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT 
          uc.id, 
          uc.remote_id,
          uc.state,
          uc.metadata, 
          uc.active,
          
          u.name as user_name, 
          u.id as user_id, 
          u.birth_date as user_birth_date,
          u.registered as user_registered,
          u.gender as user_gender,
          u.segment as user_segment,
          u.role as user_role,

          c.id as channel_id, 
          c.name as channel_name FROM bot.user_channel uc
        JOIN bot.channel c ON uc.channel_id = c.id
        JOIN bot.user u ON uc.user_id = u.id
        WHERE uc.remote_id = $1 AND uc.channel_id = $2
      `;

      client.query(query, [remote_id, channel.id], function (err, result) {

        //console.log("UserChannel.getByRemoteIdAndChannel() : (err,result) : ", err, result);
        done();

        if (err) return callback(err);

        if(result.rows.length == 0){
          return callback(errors.user_channels.NOT_FOUND);
        }

        var user_channel = UserChannel.fromRow(result.rows[0]);
        callback(null, user_channel);

      });
    });

  }

  static getActiveByRemoteIdAndChannel(remote_id, channel, callback){

    //console.log("UserChannel.getByRemoteIdAndChannel() , arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT 
          uc.id, 
          uc.remote_id,
          uc.state,
          uc.metadata, 
          uc.active,
          
          u.name as user_name, 
          u.id as user_id, 
          u.birth_date as user_birth_date,
          u.registered as user_registered,
          u.gender as user_gender,
          u.segment as user_segment,
          u.role as user_role,

          c.id as channel_id, 
          c.name as channel_name FROM bot.user_channel uc
        JOIN bot.channel c ON uc.channel_id = c.id
        JOIN bot.user u ON uc.user_id = u.id
        WHERE uc.remote_id = $1 AND uc.channel_id = $2 AND uc.active = TRUE
      `;

      client.query(query, [remote_id, channel.id], function (err, result) {

        done();

        if (err) {
          console.log("UserChannel.getByRemoteIdAndChannel() : (err) : ", err);
          return callback(err);
        }

        if(result.rows.length == 0){
          return callback(errors.user_channels.NOT_FOUND);
        }

        var user_channel = UserChannel.fromRow(result.rows[0]);
        callback(null, user_channel);

      });
    });

  }

  static getByRemoteIdAndChannelOrCreate(remote_id, channel, callback){

    var User = require("./User");

    var _log = log.child({
      module : "UserChannel.getByRemoteIdAndChannelOrCreate()"
    });

    _log.info("arguments : ", arguments);

    UserChannel.getActiveByRemoteIdAndChannel(remote_id, channel, function(err, user_channel){

      if(err){
        if(err.code == errors.user_channels.NOT_FOUND.code){

          _log.info("user not found by channel and remote id");

          async.waterfall([

            // Get channel metadata

            function(cb){

              switch(channel.name){

                case "facebook":

                  _log.info("user using facebook channel");

                  async.retry({
                    times :  5,
                    interval : 5000
                  }, function(___cb){

                    request({
                      url: "https://graph.facebook.com/v2.6/" + remote_id,
                      qs: {
                        access_token: process.env.FACEBOOK_ACCESS_TOKEN,
                        fields : 'first_name,last_name,profile_pic,locale,timezone,gender'
                      },
                      method: 'GET'
                    }, function(error, response, body) {

                      if (error) {
                        error.details = "Network error while trying to get details from " + remote_id + " facebook account.";
                        return ___cb(error);
                      }

                      try{

                        var _body = JSON.parse(body);

                        if(_body.error){
                          var _error = _body.error;
                          _error.details = "Error while trying to get details from " + remote_id + " facebook account.";
                          if(!_error.message) _error.message = _error.details;
                          _error.body = body;
                          return ___cb(_error);
                        }else{
                          return ___cb(null, _body);
                        }

                      }catch(e){
                        e.details = "Error while trying to parse body response details from " + remote_id + " facebook account.";
                        e.body = body;
                        return ___cb(e);
                      }
                  
                    });

                  }, function(error, result){
                    
                    // Los errores de Facebook son manejables.

                    if(error){

                      error.explanation = `
                        Ocurrió un error al obtener datos del usuario de Facebook.
                        Se continuará el proceso sin los metadatos oficinales, usando así 
                        con uno simple donde solamente se indica el nombre de 'Usuario Facebook`;
                      
                      return cb(null, {
                        name : 'Usuario Facebook'
                      });

                    }

                    var metadata = result;
                    return cb(null, metadata);

                  });

                  break;

                case "web":

                  _log.info("user using web channel");

                  return cb(null, {
                    name : 'Usuario Web'
                  });

                  break;

                case "twitter":
                  
                  _log.info("user using twitter channel");

                  return cb(null, {
                    name : 'Usuario Twitter'
                  });

                  break;

                default:
                  
                  _log.info("user using unknown channel");

                  return cb(null, {
                    name : 'Usuario de canal desconocido'
                  });

                  break;

              }

            },

            // Create user

            function(metadata, cb){

              var user = new User({
                name : "Usuario " + channel.name,
                enabled : true,
                registered : false
              });

              user.save(function(err){
                if(err) return cb(err);
                cb(null, user, metadata);
              });
            },

            // Create user channel

            function(user, metadata, cb){
              user_channel = new UserChannel({
                user : user,
                channel : channel,
                remote_id : remote_id,
                metadata : metadata
              });

              user_channel.save(cb);
            }

          ], function(err, user_channel){
            if(err) return callback(err);
            callback(null, user_channel);
          });

          return;

        }else{
          return callback(err);
        }

      }

      return callback(null, user_channel);
    });

  }

  static getAll(callback){

    //console.log("UserChannel.getAll(), arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT 
          uc.id, 
          uc.remote_id, 
          uc.state,
          uc.metadata,
          uc.active, 

          u.name as user_name, 
          u.id as user_id, 
          u.birth_date as user_birth_date,
          u.registered as user_registered,
          u.gender as user_gender,
          u.segment as user_segment,
          u.role as user_role,

          c.id as channel_id, 
          c.name as channel_name FROM bot.user_channel uc
        JOIN bot.channel c ON uc.channel_id = c.id
        JOIN bot.user u ON uc.user_id = u.id
      `;

      // execute a query on our database
      client.query(query, [], function (err, result) {

        //console.log("UserChannel.getAll() , (err, result) : ", err, result);
        done();

        if (err) return callback(err);

        async.map(result.rows, function(row, cb){
          var user_channel = UserChannel.fromRow(row);
          cb(null, user_channel);
        }, function(err, ucs){
          if(err) return callback(err);
          //console.log("UserChannel.getAll()", ucs);
          callback(null, ucs);
        });

      });
    });

  }

  getPassedDaysFromLastConversation(callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT 
         id, date_part('day', timezone('America/Lima'::text, now()) - update_date) as past_days
        FROM bot.conversation
        WHERE user_channel_id = $1
        ORDER BY id DESC LIMIT 1
      `;

      // execute a query on our database
      client.query(query, [self.id], function (err, result) {

        console.log("UserChannel.count() : (err,result) : ", err, result);
        done();

        if (err) {
          console.log("UserChannel.count() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        var past_days = result.rows[0].past_days;
        callback(null, past_days);

      });
    });

  }

  getTotalConversationsInTheLastDays(days, callback){

    var self = this;

    var days = days || 0;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT COUNT(*) as total 
        FROM bot.conversation 
        WHERE (timezone('America/Lima'::text, now()) - update_date) >= interval $2 day AND user_channel_id = $1;
      `;

      // execute a query on our database
      client.query(query, [self.id, days + ""], function (err, result) {

        console.log("UserChannel.getTotalConversationsInTheLastDays() : (err,result) : ", err, result);
        done();

        if (err) {
          console.log("UserChannel.getTotalConversationsInTheLastDays() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        var total = result.rows[0].total;
        callback(null, total);

      });
    });

  }

  static count(callback){

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "SELECT COUNT(*) from bot.user_channel"
      ].join("\n");

      client.query(query, [], function (err, result) {
        done();

        if (err) {
          console.log("UserChannel.count() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        var total = result.rows[0].count;
        callback(null, total);

      });
    });

  }

  static list(page, quantity, callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      
      if (err) return callback(err);

      var query = `
        SELECT 
          uc.id, 
          uc.remote_id, 
          uc.state,
          uc.metadata, 
          uc.active,

          u.name as user_name, 
          u.id as user_id, 
          u.birth_date as user_birth_date,
          u.registered as user_registered,
          u.gender as user_gender,
          u.segment as user_segment,
          u.role as user_role,

          c.id as channel_id, 
          c.name as channel_name ,
          idc.code as user_identity_document , 
          idc.type as user_identity_document_type 
        FROM bot.user_channel uc
        JOIN bot.channel c ON uc.channel_id = c.id
        JOIN bot.user u ON uc.user_id = u.id
        LEFT JOIN bot.user_identity_document uid on uid.user_id = u.id
        LEFT JOIN bot.identity_document idc on uid.identity_document_id = idc.id
        ORDER BY uc.id
        LIMIT $1 OFFSET $2
      `;

      client.query(query, [quantity, page*quantity], function (err, result) {
        done();

        if (err) return callback(errors.DB_ERROR);

        async.map(result.rows, function(row, cb){
          var uc = UserChannel.fromRow(row);
          cb(null, uc);
        }, function(err, ucs){
          if(err) return callback(errors.DB_ERROR);
          callback(null, ucs);
        });

      });

    });

  }

  static fromRow(row){

    var Channel = require("./Channel");
    var User = require("./User");

    var channel = new Channel({
        id : row.channel_id,
        name : row.channel_name
    });

    var user = new User({
      id : row.user_id,
      name : row.user_name,
      segment : row.user_segment,
      role : row.user_role,
      gender : row.user_gender,
      birth_date : row.user_birth_date,
      registered : row.user_registered,
      identity_document : row.user_identity_document,
      identity_document_type : row.user_identity_document_type
    });

    var user_channel = new UserChannel({
      id : row.id,
      user : user,
      channel : channel,
      metadata : row.metadata,
      remote_id : row.remote_id,
      state : row.state,
      active : row.active
    });

    return user_channel;

  }

};
