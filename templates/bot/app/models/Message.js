"use strict";

var Bot = require("./../../Bot");
var pg = require("pg");

var request = require('request');
var async = require("async");
var moment = require("moment-timezone");
var Utils = require("./../../utils/Utils");
var errors = require("./../../utils/errors");

var FacebookChannel = require("./channels/FacebookChannel");
var WebChannel = require("./channels/WebChannel");
var TwitterChannel = require("./channels/TwitterChannel");

module.exports = class Message {

  constructor(data){

    this._id = data.id;
    this._data = data.data;
    this._content = data.content;

    this._type = data.type || "text";
    this._creation_date = data.creation_date || null;
    this._metadata = data.metadata;
    this._from_bot = (data.from_bot != null) ? data.from_bot : false;
    
    this._save = (data.save != null) ? data.save : true;

    this._understood = (data.understood != null)? data.understood : true;

    this._sensitive = (data.sensitive != null) ? data.sensitive : false;
    this._comment = data.comment;
    this._stext = data.stext;
    this._keep = (data.keep != null) ? data.keep : true;

    this._delay = (data.delay != null) ? data.delay : process.env.MESSAGE_DELAY;
    this._retries = data.retries;

    this._conversation = data.conversation;

    // Alternative , when using as a notification

    if(!data.conversation && data.user_channel){

      var Conversation = require("./Conversation");

      this._conversation = new Conversation({
        user_channel : data.user_channel
      });

    }

  }

  set understood(value){
    this._understood = value;
  }

  get understood(){
    return this._understood;
  }

  set retries(value){
    this._retries = value;
  }

  get retries(){
    return this._retries;
  }

  set delay(value){
    this._delay = value;
  }

  get delay(){
    return this._delay;
  }

  set keep(value){
    this._keep = value;
  }

  get keep(){
    return this._keep;
  }

  set stext(value){
    this._stext = value;
  }

  get stext(){
    return this._stext;
  }

  set sensitive(value){
    this._sensitive = value;
  }

  get sensitive(){
    return this._sensitive;
  }

  set comment(value){
    this._comment = value;
  }

  get comment(){
    return this._comment;
  }

  set id(value){
    this._id = value;
  }

  get id(){
    return this._id;
  }

  set data(value){
    this._data = value;
  }

  get data(){
    return this._data;
  }

  set content(value){
    this._content = value;
  }

  get content(){
    return this._content;
  }

  set type(value){
    this._type = value;
  }

  get type(){
    return this._type;
  }

  set creation_date(value){
    this._creation_date = value;
  }

  get creation_date(){
    return this._creation_date;
  }

  set metadata(value){
    this._metadata = value;
  }

  get metadata(){
    return this._metadata;
  }

  set conversation(value){
    this._conversation = value;
  }

  get conversation(){
    return this._conversation;
  }

  get from_bot(){
    return this._from_bot;
  }

  set from_bot(value){
    this._from_bot = value;
  }

  toJSON(minimal){

    var minimal = (minimal != null)?minimal:false;

    if(this.conversation)
      delete this.conversation.context;

    if(minimal){
      return {
        id : this.id,
        content : this.content,
        data : this.data,
        type : this.type,
        from_bot: this.from_bot,
        stext : this.stext,
        sensitive : this.sensitive,
        understood : this.understood
      }
    }else{
      return {
        id : this.id,
        conversation : (this.conversation && this.conversation.toJSON) ? this.conversation.toJSON() : null,
        content : this.content,
        data : this.data,
        type : this.type,
        from_bot : this.from_bot,
        creation_date : this.creation_date,
        stext : this.stext,
        sensitive : this.sensitive,
        understood : this.understood
      }
    }

  }

  save(callback){

    var self = this;

    if(!process.env.SAVE_MESSAGES && self.understood){
      return callback(null, self);
    }

    if(self._save == false)
      return callback(null, self);

    if(self.id != null)
      return self.update(callback);

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "INSERT INTO bot.message (conversation_id, type, content, metadata, from_bot, understood, creation_date) values ($1, LOWER($2), $3, $4, $5, $6, $7) RETURNING *"
      ].join("\n");

      var date = moment.tz('America/Lima').format("YYYY-MM-DD HH:mm:ss.SSSSS");

      console.log("Message.save() | sensitive", self.sensitive, " | comments :", self.comments);

      try{
        if(self.sensitive){
          self.content = ((self.stext != null)? self.stext : self.comment) || "[SENSITIVE DATA]";
        }else{
          if(self.content == null && self.comment){
            self.content = self.comment;
          }
        }
      }catch(e){
        console.error("Message.save() , ERROR : ", e);
        return callback(e);
      }

      client.query(query, [self.conversation.id, self.type, self.content, self.metadata, self.from_bot, self.understood, date], function (err, result) {

        done();

        if (err) {
          console.log("Message.save() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        var result = Message.fromRow(result.rows[0]);
        self.id = result.id;
        callback();

      });
    });

  }

  update(callback){

    console.log("Message.update() , id = " , this.id);

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "UPDATE bot.message SET content = $2::text , metadata = $3 , understood = $4 WHERE ID = $1::int RETURNING *"
      ].join("\n");

      client.query(query, [self.id, self.content, self.metadata, self.understood], function (err, result) {

        done();

        if (err) return callback(err);

        var result = result.rows[0];
        self.id = result.id;

        callback(null, self);

      });
    });

  }

  delete(callback){

    console.log("Message.delete() , id = " , this.id);

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "DELETE FROM bot.message WHERE id = $1::int"
      ].join("\n");

      client.query(query, [self.id], function (err) {
        done();

        if(err) return callback(err);
        self.id = null;
        callback(null, self);
      });
    });

  }

  send(callback){

    console.log("Message.send() | type =", this.type, "| channel =", this.conversation.user_channel.channel.name, "| Preparing to send a message ...");

    var self = this;

    if(self.conversation.user_channel.channel.name == "facebook" && self.delay > 0){

        setTimeout(function(){

          async.retry({
            times : 5,
            interval : 1000
          }, function(_cb){
            
           self._send(function(err){
            if(err) {
              return _cb(err);
            }
            _cb();
           });

          }, function(err){
            
            if(err){
              return callback(err);
            }

            callback();
          });

        }, 1000 * self.delay);

    }else{

      async.retry({
        times : 2,
        interval : 1000
      }, function(_cb){
       
       self._send(function(err){
        if(err) {
          return _cb(err);
        }
        _cb();
       });

      }, function(err){
        if(err){
          return callback(err);
        }

        callback();
      });

    }

  }

  _send(callback){

    var self = this;

    switch(this.type){
      
      case 'custom':

        request({
          url: 'https://graph.facebook.com/v2.6/me/messages',
          qs: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
          method: 'POST',
          json: {
            recipient: { id : self.conversation.user_channel.remote_id },
            "message": self.data
          }
        }, function(error, response, body) {
          console.log("Message.send() | type =", self.type, "| Recipient =", self.conversation.user_channel.remote_id, "| Message was sent, results : error =", error, " , body =", body);
          
          if(error) {
            return callback(error);
          }

          if(body && body.error){
            return callback(error);
          }
          
          callback();
        });

        break;

      case 'text':

        if(this.content == null)
          return callback();

        if(this.content != null && typeof this.content == "string" && this.content.trim().length == 0){
          console.log("Empty message, don't send anything to the user.".yellow);
          return callback();
        }

        if(this.content != null && typeof this.content == "object" && this.content instanceof Array && this.content.length == 0){
          console.log("Empty message, don't send anything to the user.".yellow);
          return callback();
        }

        switch(self.conversation.user_channel.channel.name) {

          case "twitter":
          
            TwitterChannel.send(self, function(err){
              if(err) return callback(err);
              self.save(callback);
            });

            break;

          case "facebook":

            FacebookChannel.send(self, function(err){
              if(err) return callback(err);
              self.save(callback);
            });

            break;

          case "web":

            WebChannel.send(self, function(err){
              if(err) return callback(err);
              self.save(callback);
            });

            break;

          default:
            return self.save(callback);

        }

        break;

      case 'url':

        var payload = null;

        payload = {
          "template_type":"generic",
          "elements": [
            {
              "title": self.data.title,
              "subtitle": self.data.description,
              "buttons":[
                {
                  "type": self.data.type || "web_url",
                  "url": self.data.url,
                  "title": self.data.label,
                  "webview_height_ratio":"tall"
                }
              ]
            }
          ]
        };

        if(self.data.image){
          payload.elements[0].image_url = self.data.image;
        }

        request({
          url: 'https://graph.facebook.com/v2.6/me/messages',
          qs: { access_token: process.env.FACEBOOK_ACCESS_TOKEN },
          method: 'POST',
          json: {
            recipient: { id : self.conversation.user_channel.remote_id },
            "message":{
              "attachment":{
                "type":"template",
                "payload": payload
              }
            }
          }
        }, function(error, response, body) {
          console.log("Message.send() | type =", self.type, "| Recipient =", self.conversation.user_channel.remote_id, "| Message was sent, results : error =", error, " , body =", body);
          if(error) {
            return callback(error);
          }

          if(body && body.error){
            return callback(error);
          }
          
          callback();
        });

        break;

      case 'options':

        if(this.data != null && this.data.options != null && this.data.options.length == 0){
          console.log("Empty options, don't send anything to the user.".yellow);
          return callback();
        }

        switch(self.conversation.user_channel.channel.name) {

          case "twitter":

            TwitterChannel.send(self, function(err){
              if(err) return callback(err);
              self.save(callback);
            });

            break;

          case "facebook":

            FacebookChannel.send(self, function(err){
              if(err) return callback(err);
              self.save(callback);
            });

            break;

          case "web":

            WebChannel.send(self, function(err){
              if(err) return callback(err);
              self.save(callback);
            });

            break;

          default:
            return self.save(callback);

        }

        break;

    }

  }

  static getByConversation(conversation, callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "SELECT * from bot.message where conversation_id = $1"
      ].join("\n");

      client.query(query, [conversation.id], function (err, result) {
        done();

        if(err) return callback(err);

        async.map(result.rows, function(row, cb){
          var message = Message.fromRow(row);
          message.conversation = conversation;

          cb(null, message);
        }, function(err, messages){
          if(err) return callback(err);
          callback(null, messages);
        });

      });
    });

  }

  static getById(id, callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT 
         m.*, 
         c.context as conversation_context, 
         c.wid as conversation_wid, 
         c.user_channel_id as conversation_user_channel_id, 
         c.creation_date as conversation_creation_date, 
         c.update_date as conversation_update_date, 
         uc.user_id as uc_user_id, 
         uc.channel_id as uc_channel_id, 
         uc.metadata as uc_metadata, 
         uc.remote_id as uc_remote_id, 
         cc.name as uc_channel_name, 
         uc.id as uc_id 
         FROM bot.message m 
         JOIN bot.conversation c on m.conversation_id = c.id
         JOIN bot.user_channel uc on c.user_channel_id = uc.id
         JOIN bot.channel cc on cc.id = uc.channel_id
         WHERE m.id = $1
      `;

      client.query(query, [id], function (err, result) {
        done();

        if (err) {
          console.log("Message.getById() , ERROR : ", err);
          return callback(errors.DB_ERROR);
        }

        if(result.rows.length == 0){
          var error = errors.messages.NOT_FOUND;
          return callback(error);
        }

        var result = Message.fromRow(result.rows[0]);
        callback(null, result);

      });
    });

  }

  static fromRow(row){

    var Conversation = require('./Conversation');

    var crow = {
      uc_id : row.uc_id,
      uc_user_id : row.uc_user_id,
      uc_channel_id : row.uc_channel_id,
      uc_channel_name : row.uc_channel_name,
      uc_metadata : row.uc_metadata,
      uc_remote_id : row.uc_remote_id,
      id : row.conversation_id,
      wid : row.conversation_wid,
      context : row.conversation_context
    }

    var conversation = Conversation.fromRow(crow, false);

    var message = new Message({
      id : row.id,
      content : row.content,
      data : row.data,
      type : row.type,
      conversation : conversation,
      metadata : row.metadata,
      creation_date : row.creation_date,
      from_bot : row.from_bot,
      understood : row.understood
    });

    return message;

  }

}
