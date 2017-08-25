"use strict";

var Bot = require("./../../Bot");

var errors = require("./../../utils/errors");
var Utils = require("./../../utils/Utils");

var async = require('async');

module.exports = class Channel {

  constructor(data){
    this._id = data.id;
    this._name = data.name;
    this._enabled = (data.enabled != null) ? data.enabled : true;
    this._whitelisted = (data.whitelisted != null)? data.whitelisted : true;
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

  set whitelisted(value){
    this._whitelisted = value;
  }

  get whitelisted(){
    return this._whitelisted;
  }

  toJSON(){
    return {
      id : this.id,
      name : this.name,
      enabled : this.enabled,
      whitelisted : this.whitelisted
    }
  }

  save(callback){

    var self = this;

    if(self.id != null)
      return self.update(callback);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var query = [
        "INSERT INTO bot.channel (name) values (LOWER($1)) RETURNING *"
      ].join("\n");

      client.query(query, [self.name], function (err, result) {

        //console.log("Channel.save() , (err,result) : ", err, result);
        done();

        if (err) {
          return callback(err);
        }

        var result = result.rows[0];
        self.id = result.id;
        self.name = result.name;

        //console.log("Channel.save() , result : ", result);
        callback(null, self);

      });
    });

  }

  update(callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var query = [
        "UPDATE bot.channel SET name = $2::text , enabled = $3::boolean WHERE ID = $1::int RETURNING *"
      ].join("\n");

      // execute a query on our database
      client.query(query, [self.id, self.name, self.enabled], function (err, result) {

        //console.log("Channel.update() , (err,result) : ", err, result);
        done();

        if (err) return callback(err);
        result = result.rows[0];
        self.id = result.id;
        self.name = result.name;

        //console.log("Channel.update() , result : ", result);
        callback(null, self);

      });
    });

  }

  delete(callback){

    //console.log("Channel.delete() , id = " , this.id);

    var self = this;

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var query = [
        "DELETE FROM bot.channel WHERE id = $1::int"
      ].join("\n");

      // execute a query on our database
      client.query(query, [self.id], function (err, result) {

        //console.log("Channel.delete() , (err,result) : ", err, result);
        done();

        if(err) {
          return callback(err);
        }

        self.id = null;
        self.name = result.name;
        callback(null, self);
      });
    });

  }

  static disableAll(callback){

    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var query = [
        "UPDATE bot.channel SET enabled = false"
      ].join("\n");

      client.query(query, [], function (err, result) {
        done();
        if (err) {
          return callback(err);
        }
        callback(null);
      });
    });

  }

  static getById(id, callback){

    //console.log("Channel.getById() , arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var query = [
        "SELECT * FROM bot.channel WHERE id = $1"
      ].join("\n");

      // execute a query on our database
      client.query(query, [id], function (err, result) {

        //console.log("Channel.getById() : (err,result) : ", err, result);
        done();

        if (err) {
          return callback(err);
        }

        if(result.rows.length == 0){
          return callback(errors.channels.NOT_FOUND);
        }

        var result = Channel.fromRow(result.rows[0]);
        //console.log("Channel.getById()", result);
        callback(null, result);

      });
    });

  }

  static getByName(name, callback){

    //console.log("Channel.getByName() , arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var query = [
        "SELECT * FROM bot.channel WHERE LOWER(name) = LOWER($1)"
      ].join("\n");

      // execute a query on our database
      client.query(query, [name], function (err, result) {

        //console.log("Channel.getByName() : (err,result) : ", err, result);
        done();

        if (err) {
          return callback(err);
        }

        if(result.rows.length == 0){
          return callback(errors.channels.NOT_FOUND);
        }

        var result = Channel.fromRow(result.rows[0]);
        //console.log("Channel.getByName()", result);
        callback(null, result);

      });
    });

  }

  static getAll(callback){

    //console.log("Channel.getAll(), arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var query = [
        "SELECT * FROM bot.channel"
      ].join("\n");

      // execute a query on our database
      client.query(query, [], function (err, result) {

        //console.log("Channel.getAll() , (err, result) : ", err, result);
        done();

        if (err) {
          return callback(err);
        }

        //console.log("Channel.getAll()", result);
        callback(null, result.rows);
      });
    });

  }

  static delete(id, callback){

    // console.log("IDWhitelist.delete() , id = " , this.id);

    var self = this;

    Channel.getById(id, function(err, channel){
      if(err) {
        return callback(err);
      }

      channel.delete(function(err2){
        if(err2) {
          return callback(err2);
        }
        return callback();
      });

    })

  }

  static list(page, quantity, callback){

    //console.log("Channel.list(), arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var query = [
        "SELECT * FROM bot.channel LIMIT $1 OFFSET $2"
      ].join("\n");

      // execute a query on our database
      client.query(query, [quantity, page*quantity], function (err, result) {

        //console.log("Channel.list() , (err, result) : ", err, result);
        done();

        if (err) {
          console.log("Channel.list() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        async.map(result.rows, function(row, cb){
          var channel = Channel.fromRow(row);
          cb(null, channel);
        }, function(err, channels){
          if(err) {
           return callback(errors.DB_ERROR);
          }
          callback(null, channels);
        });

      });

    });

  }

  static search(query, page,  quantity, callback){

    console.log("Channel.search(), arguments : ", arguments);

    query = query || "";

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var sql = [
        "SELECT * FROM bot.channel WHERE name LIKE $1 LIMIT $2 OFFSET $3"
      ].join("\n");

      // execute a query on our database
      client.query(sql, [query + "%", quantity, page*quantity], function (err, result) {

        console.log("Channel.search() , (err, result) : ", err, result);
        done();

        if (err) {
          console.log("Channel.list() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        async.map(result.rows, function(row, cb){
          var idc = Channel.fromRow(row);
          cb(null, idc);
        }, function(err, idcs){
          if(err) {
            return callback(errors.DB_ERROR);
          }
          callback(null, idcs);
        });

      });

    });

  }

  static count(callback){


    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var query = [
        "SELECT COUNT(*) from bot.channel"
      ].join("\n");

      client.query(query, [], function (err, result) {

        console.log("Channel.count() : (err,result) : ", err, result);
        done();

        if (err) {
          console.log("Channel.count() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        var total = result.rows[0].count;
        callback(null, total);

      });
    });

  }

  static countByQuery(query, callback){


    // console.log("IDWhitelist.getByCodeAndType() , arguments : ", arguments);

    // connect to our database
    Bot.getDB().connect(function (err, client, done) {
      if (err) {
        return callback(err);
      }

      var sql = [
        "SELECT COUNT(*) from bot.channel WHERE name LIKE $1"
      ].join("\n");

      client.query(sql, [query + "%"], function (err, result) {

        console.log("IDocument.countByQuery() : (err,result) : ", err, result);
        done();

        if (err) {
          console.log("IDocument.countByQuery() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        var total = result.rows[0].count;
        callback(null, total);

      });
    });

  }

  static fromRow(json){
    var channel = new Channel(json);
    return channel;
  }

};
