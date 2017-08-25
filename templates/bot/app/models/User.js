"use strict";

var Bot = require("./../../Bot");

var errors = require("./../../utils/errors");

var async = require('async');

var UserChannel = require("./UserChannel");

module.exports = class User {

  constructor(data){
    this._id = data.id;
    this._name = data.name;
    this._enabled = (data.enabled != null) ? data.enabled : true;
    this._registered = (data.registered != null) ? data.registered : false;
    this._accepted_terms = (data.accepted_terms != null) ? data.accepted_terms : false;

    this._birth_date = data.birth_date;
    this._creation_date = data.creation_date;
    this._gender = data.gender;
    this._segment = data.segment;
    this._role = data.role || 0;

    // JOIN DATA

    this._identity_document = data.identity_document;
    this._identity_document_type = data.identity_document_type;
  }

  set id(value){
    this._id = value;
  }

  get id(){
    return this._id;
  }

  set name(value){
    this._name = value;
  }

  get name(){
    return this._name;
  }

  set enabled(value){
    this._enabled = value;
  }

  get enabled(){
    return this._enabled;
  }

  get registered(){
    return this._registered;
  }

  set registered(value){
    this._registered = value;
  }

  get accepted_terms(){
    return this._accepted_terms;
  }

  set accepted_terms(value){
    this._accepted_terms = value;
  }

  get birth_date(){
    return this._birth_date;
  }

  set birth_date(value){
    this._birth_date = value;
  }

  get creation_date(){
    return this._creation_date;
  }

  set creation_date(value){
    this._creation_date = value;
  }

  get gender(){
    return this._gender;
  }

  set gender(value){
    this._gender = value;
  }

  get segment(){
    return this._segment;
  }

  set segment(value){
    this._segment = value;
  }

  get role(){
    return this._role;
  }

  set role(value){
    this._role = value;
  }

  // JOIN DATA

  get identity_document(){
    return this._identity_document;
  }

  set identity_document(value){
    this._identity_document = value;
  }

  get identity_document_type(){
    return this._identity_document_type
  }

  set identity_document_type(value){
    this._identity_document_type = value;
  }

  toJSON(){
    return {
      id : this.id,
      name : this.name,
      enabled : this.enabled,
      registered : this.registered,
      accepted_terms : this.accepted_terms,
      identity_document : this._identity_document,
      identity_document_type : this._identity_document_type,

      birth_date : this.birth_date,
      creation_date : this.creation_date,
      gender : this.gender,
      segment : this.segment,
      role : this.role
    }
  }

  save(callback){

    var self = this;

    if(self.id != null)
      return self.update(callback);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "INSERT INTO bot.user (name, registered, gender, birth_date, accepted_terms, segment, role) values ($1::text, $2::boolean, $3, $4, $5, $6, $7) RETURNING *"
      ].join("\n");

      // execute a query on our database
      client.query(query, [self.name, self.registered, self.gender, self.birth_date, self.accepted_terms, self.segment, self.role], function (err, result) {
        if (err) return callback(err);
        done();

        var result = result.rows[0];
        self.id = result.id;
        self.name = result.name;

        //console.log("User.save() , result : ", result);
        callback(null, self);
      });
    });

  }

  update(callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        UPDATE 
          bot.user 
        SET 
          name = $2::text , 
          registered = $3::boolean , 
          enabled = $4::boolean , 
          accepted_terms = $5::boolean ,

          gender = $6,
          birth_date = $7,
          segment = $8,
          role = $9

        WHERE ID = $1::int RETURNING *
      `;

      client.query(query, [self.id, self.name, self.registered, self.enabled, self.accepted_terms, self.gender, self.birth_date, self.segment, self.role], function (err, result) {

        if (err) return callback(err);
        done();

        var result = result.rows[0];
        self.id = result.id;
        self.name = result.name;

        //console.log("User.update() , result : ", result);
        callback(null, self);

      });
    });

  }

  delete(callback){

    //console.log("User.delete() , id = " , this.id);

    var self = this;

    async.series([

      function delete_user_channels(cb){

        self.getUserChannels(function(err, user_channels){
          if(err) return cb(err);
          async.each(user_channels, function(user_channel, cb2){
            user_channel.delete(cb2);
          }, cb);
        });

      },

      function delete_user(cb){

        Bot.getDB().connect(function (err, client, done) {
          if (err) return cb(err);

          var query = [
            "DELETE FROM bot.user WHERE id = $1::int"
          ].join("\n");

          // execute a query on our database
          client.query(query, [self.id], function (err, result) {
            done();
            if(err) return cb(err);
            cb(null, self);
          });
        });
      }

    ], function(err){
      //console.log("User.delete() , (err) : ", err);
      if(err) return callback(err);
      self.id = null;
      return callback();
    });

  }

  // User - Channel


  addChannel(channel, callback){

    var self = this;

    var user_channel = new UserChannel({
      user : self,
      channel : channel
    });

    user_channel.save(callback);

  }

  deleteChannel(channel, callback){

    var self = this;

    self.getUserChannel(channel, function(err, user_channel){
      if(err) return callback(err);
      user_channel.delete(callback);
    });

  }

  getUserChannel(channel, callback){
    var self = this;
    //console.log("User.getUserChannel() , arguments : ", arguments);
    UserChannel.getByUserAndChannel(self, channel, callback);
  }

  getUserChannels(callback){
    var self = this;
    //console.log("User.getUserChannels() , arguments : ", arguments);
    UserChannel.getByUser(self, callback);
  }

  getUserIdentityDocument(callback){

    var self = this;
    var UserIDocument = require("./UserIDocument");

    UserIDocument.getByUser(self, function(err, user_identity_document){
      if(err) return callback(err);
      if(user_identity_document.length > 0)
        return callback(null, user_identity_document[0]);
      callback(null);
    })

  }

  static getById(id, callback){

    //console.log("User.getById() , arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        select u.*, id.code as identity_document , id.type as identity_document_type from bot.user u
        LEFT OUTER JOIN bot.user_identity_document uid on uid.user_id = u.id
        LEFT OUTER JOIN bot.identity_document id on uid.identity_document_id = id.id
        where u.id = $1
      `;

      // execute a query on our database
      client.query(query, [id], function (err, result) {

        //console.log("User.getById() : (err,result) : ", err, result);
        done();

        if (err) return callback(err);

        if(result.rows.length == 0){
          return callback(errors.users.NOT_FOUND);
        }

        var result = User.fromRow(result.rows[0]);
        //console.log("User.getById()", result);
        callback(null, result);

      });
    });

  }

  static getAll(callback){

    //console.log("User.getAll(), arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "SELECT * FROM bot.user"
      ].join("\n");

      client.query(query, [], function (err, result) {
        done();

        if (err) return callback(err);

        async.map(result.rows, function(row, cb){
          var user = User.fromRow(row);
          cb(null, user);
        }, function(err, users){
          if(err) return callback(errors.DB_ERROR);
          callback(null, users);
        });

      });
    });

  }

  static getByBirthday(callback){

    Bot.getDB().connect(function (err, client, done) {

      if (err) return callback(err);

      var query = `
        SELECT 
         * 
        FROM bot.user
        WHERE 
        EXTRACT(DAY from birth_date) = 
        EXTRACT(DAY FROM timezone('America/Lima'::text, now()));
      `;

      client.query(query, [], function (err, result) {
        done();
        if (err) return callback(err);

        async.map(result.rows, function(row, cb){
          var user = User.fromRow(row);
          cb(null, user);
        }, function(err, users){
          if(err) return callback(errors.DB_ERROR);
          callback(null, users);
        });

      });

    });

  }

  static list(page, quantity, callback){

    //console.log("User.list(), arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        select u.*, id.code as identity_document , id.type as identity_document_type from bot.user u
        LEFT OUTER JOIN bot.user_identity_document uid on uid.user_id = u.id
        LEFT OUTER JOIN bot.identity_document id on uid.identity_document_id = id.id
        ORDER BY u.id
        LIMIT $1 OFFSET $2
      `;

      console.log("LIMIT :", quantity, "OFFSET :", page*quantity);

      // execute a query on our database
      client.query(query, [quantity, page*quantity], function (err, result) {

        //console.log("User.list() , (err, result) : ", err, result);
        done();

        if (err) {
          console.log("Users.list() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        async.map(result.rows, function(row, cb){
          var user = User.fromRow(row);
          cb(null, user);
        }, function(err, users){
          if(err) return callback(errors.DB_ERROR);
          callback(null, users);
        });

      });

    });

  }

  static count(callback){

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "SELECT COUNT(*) from bot.user"
      ].join("\n");

      client.query(query, [], function (err, result) {

        done();

        if (err) {
          console.log("User.count() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        var total = result.rows[0].count;
        callback(null, total);

      });
    });

  }

  static countByRegistration(callback){

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "SELECT registered, COUNT(*) FROM bot.user u GROUP by u.registered"
      ].join("\n");

      client.query(query, [], function (err, result) {

        console.log("User.countByRegistered() : (err,result) : ", err, result);
        done();

        if (err) {
          console.log("User.countByRegistered() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        var results = result.rows;
        callback(null, results);

      });
    });

  }

  static countByChannel(callback){

    var query = `
        select c.name, count(*)
        FROM bot.channel c 
        JOIN bot.user_channel uc
        ON uc.channel_id = c.id
        GROUP BY (c.name)`;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

        client.query(query, [], function (err, result) {

        console.log("User.countByChannel() : (err,result) : ", err, result);
        done();

        if (err) {
          console.log("User.countByChannel() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        var results = result.rows;
        callback(null, results);

      });
    });

  }

  static countByQuery(query, callback){

    console.log("User.countByQuery(), arguments : ", arguments);

    query = query || "";

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var sql = [
        "SELECT count(*) FROM bot.user WHERE LOWER(name) LIKE $1"
      ].join("\n");

      // execute a query on our database
      client.query(sql, [query.toLowerCase() + "%"], function (err, result) {

        console.log("User.countByQuery() , (err, result) : ", err, result);
        done();

        if (err) {
          console.log("User.countByQuery() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        var total = result.rows[0].count;
        callback(null, total);

      });

    });

  }

  static search(query, page,  quantity, callback){

    console.log("User.search(), arguments : ", arguments);

    query = query || "";

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var sql = [
        "SELECT * FROM bot.user WHERE LOWER(name) LIKE $1 LIMIT $2 OFFSET $3"
      ].join("\n");

      // execute a query on our database
      client.query(sql, [query.toLowerCase() + "%", quantity, page*quantity], function (err, result) {

        console.log("User.search() , (err, result) : ", err, result);
        done();

        if (err) {
          console.log("User.search() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        async.map(result.rows, function(row, cb){
          var idc = User.fromRow(row);
          cb(null, idc);
        }, function(err, idcs){
          if(err) return callback(errors.DB_ERROR);
          callback(null, idcs);
        });

      });

    });

  }

  static fromRow(json){
    var user = new User(json);
    return user;
  }

};
