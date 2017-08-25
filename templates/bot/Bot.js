"use strict"

var errors = require("./utils/errors"),
    async = require("async"),
    fs = require('fs'),
    http = require("http"),
    https = require('https');

var log = global.log.child({
  module : "Bot.js"
});

let DB = null;
let CHANNELS = null;
let SERVER = null;

let AI = {
  conversation : null
};

class Bot {
  
  static get ai(){
    return AI;
  }

  static set ai(value){
    AI = value;
  }

  static get db() {
    return DB;
  }

  static set db(db) {
    DB = db;
  }

  static getDB() {
    return DB;
  }

  static getAI(){
    return AI;
  }

  static get server(){
    return SERVER;
  }

  static set server(value){
    SERVER = value;
  }

  static get channels() {
    return CHANNELS;
  }

  static set channels(values) {
    CHANNELS = values;
  }

  static setup(config) {
    Bot.db = config.db;
    Bot.channels = config.channels; // ["facebook", "twitter"]
    Bot.ai = config.ai;
  }

  static toJSON() {
    return {
      channels: CHANNELS
    }
  }

  static start(callback) {

    log.info("Bot, starting server ...");

    var port = process.env.PORT || 3000;

    async.series([

      function (cb){

        log.info("Bot | Creating server...");
          
        var server = Bot.server = require("express")();
        server = require("./config/express")(server);

        cb();
      },

      function (cb) {
        log.info("Bot | Loading channels ...");
        Bot.loadChannels(CHANNELS, cb);
      },

      function (cb) {
        log.info("Bot | Starting channels ...");
        Bot.startChannels(cb);
      },

      function (cb) {

        log.info("Bot | Starting to listen through server ...");
        
        if (Bot.server != null){

          if(process.env.SSL_KEY && process.env.SSL_CERT){
            var options = {
                key: fs.readFileSync(process.env.SSL_KEY),
                cert: fs.readFileSync(process.env.SSL_CERT),
            };
  
            https.createServer(options, Bot.server).listen(port, function(){
              cb();
            });
          }else{
            http.createServer(Bot.server).listen(port, function(){
              cb();
            });
          }

        }else{
          cb();
        }

      }

    ], function (err) {

      if (err) {
        if (callback) return callback(err);
        else throw err;
      }
      
      log.info("Bot | Started on port: " + port);      
      if (callback) callback(null, Bot.server);
    });

  }

  static loadChannels(channels, callback) {

    log.info("loadChannels...");

    var Channel = require("./app/models/Channel");

    // Disable all channels. Enable only included channels.

    Channel.disableAll(function (err) {

      if (err) {
        log.error({
          err : err
        }, "error on loadChannels | Channel.getByName...");
        return callback(err);
      }

      async.map(channels, function (_channel, cb) {
        Channel.getByName(_channel.name, function (err, channel) {

          if (err) {
            if (err.code == errors.channels.NOT_FOUND.code) {
              var channel = new Channel({
                name: _channel.name,
                enabled: _channel.enabled
              });
              channel.save(function (err) {
                if (err) return cb(err);
                cb(null, channel);
              });
              return;
            } else {
              log.error({
                err : err
              }, "error on loadChannels | Channel.getByName...");
              return cb(err);
            }
          }

          channel.enabled = _channel.enabled;
          channel.update(cb);

        });

      }, function (err, _channels) {        
        if (err) return callback(err);
        Bot.channels = {};

        for (let i = 0; i < channels.length; i++) {
          Bot.channels[channels[i].name] = _channels[i].toJSON();
        }

        callback();
      });

    });

  }

  static startChannels(callback) {
    require("./config/routes")(Bot.server);    
    callback();
  }

}

module.exports = Bot;