"use strict";

var Bot = require("./../../Bot");
var errors = require("./../../utils/errors");
var async = require('async');

var Message = require('./Message');
var Action = require("./Action");
var Utils = require("./../../utils/Utils");
var ConversationStateTypes = require("./../constants/ConversationStateTypes");
var moment = require("moment-timezone");
var emojione = require("emojione");

var FROM_BOT_TEXT = "[[/FROM_BOT/]]";

var log = global.log.child({
  module : "models/Conversation.js"
});

module.exports = class Conversation {

  constructor(data){
    this._id = data.id;
    this._wid = data.wid;
    this._user_channel = data.user_channel;
    this._expired = (data.expired != null) ? data.expired : false;

    this._creation_date = data.creation_date;
    this._update_date = data.update_date;

    // Default context

    this._context = data.context || {
      authorized : true,
      registered : false,
      state : ConversationStateTypes.WAITING
    };
    
  }

  set id(value){
    this._id = value;
  }

  get id(){
    return this._id;
  }

  set wid(value){
    this._wid = value;
  }

  get wid(){
    return this._wid;
  }

  set context(value){
    this._context = value;
  }

  get context(){
    return this._context;
  }

  set expired(value){
    this._expired = value;
  }

  get expired(){
    return this._expired;
  }

  set creation_date(value){
    this._creation_date = value;
  }

  get creation_date(){
    return this._creation_date;
  }

  set update_date(value){
    this._update_date = value;
  }

  get update_date(){
    return this._update_date;
  }

  set user_channel(value){
    this._user_channel = value;
  }

  get user_channel(){
    return this._user_channel;
  }

  toJSON(){
    return {
      id : this.id,
      wid : this.wid,
      user_channel : (this.user_channel && this.user_channel.toJSON) ? this.user_channel.toJSON() : this.user_channel,
      context : this.context,
      expired : this.expired,
      creation_date : this.creation_date,
      update_date : this.update_date
    }
  }

  duplicate(callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var context = Conversation.obfuscateContext(self.context);
      var creation_date = moment.tz('America/Lima').format("YYYY-MM-DD HH:mm:ss.SSSSS");
      var update_date = creation_date;

      var query = [
        "INSERT INTO bot.conversation (wid, user_channel_id, context, creation_date, update_date) values ($1, $2, $3, $4, $5) RETURNING *"
      ].join("\n");

      client.query(query, [self.wid, self.user_channel.id, self.context, creation_date, update_date], function (err, result) {
        done();

        if (err) {
          console.error(err);  
          return callback(err);
        }

        var result = result.rows[0];
        self.id = result.id;
        
        return callback(null, self, true);
      
      });
    });

  }

  save(callback, in_progress){

    log.info("Conversation.save() , it seems a new conversation is being saved ...");

    var self = this;
    var in_progress = (in_progress != null)?in_progress:false;

    if(self.id != null)
      return self.update(callback);

    if(this.user_channel == null || (this.user_channel != null && this.user_channel.id == null)){
      return callback(errors.conversations.USER_CHANNEL_NOT_FOUND);
    }

    async.waterfall([

      function load_watson_id_on_self(cb){

        log.info("Conversation.save() | load_watson_id_on_self ...");

        async.retry({
          times : process.env.CONVERSATION_REQUEST_RETRIES,
          interval : process.env.CONVERSATION_REQUEST_RETRIES_INTERVAL_IN_SECONDS
        }, function(__cb){

          Bot.getAI().conversation.message({
            input: {},
            context : self.context,
            workspace_id: process.env.WATSON_WORKSPACE
          }, function(err, response){

            if (err) {
              var e = errors.WATSON_ERROR;
              e.details = err;
              e.conversation_id = self.id;
              e.user_channel_id = (self.user_channel)?self.user_channel.id:null;
              return __cb(e);
            }
            
            // Check error in response
            if(response != null && response.output != null && response.output.error){
              log.info("Conversation.save() | remote_id =", self.user_channel.remote_id, "| Error in response output :", response.output.error);
              var e = errors.WATSON_ERROR;
              e.details = response.output.error;
              e.conversation_id = self.id;
              e.user_channel_id = (self.user_channel)?self.user_channel.id:null;
              return __cb(e);
            }

            return __cb(null, response);

          });

        }, function(err, response) {

          if(err){
            log.error({
              err : err
            }, "Conversation.save() | watson ERROR ");
            err.conversation_id = self.id;
            err.user_channel_id = (self.user_channel)?self.user_channel.id:null;
            return cb(err);
          }

          log.info("Conversation.save() | load_watson_id_on_self | watson output :", response);
          self.wid = response.context.conversation_id;
          self.context = response.context;
          return cb(null, response);
        });

         
      },

      function create_conversation(response, cb){

        if(self.wid == null){
          return cb(errors.conversations.WATSON_ID_NOT_FOUND);
        }

        // When we save a conversation for the first time, we need to get
        // the watson Id. The unique way to do this is by sending a message to
        // the watson conversation service.
        
        Bot.getDB().connect(function (err, client, done) {
          if (err) return cb(err);

          if(in_progress)
            self.context.step = "conversation_in_progress";

          var context = Conversation.obfuscateContext(self.context);
          var creation_date = moment.tz('America/Lima').format("YYYY-MM-DD HH:mm:ss.SSSSS");
          var update_date = creation_date;

          var query = `
            INSERT INTO bot.conversation (wid, user_channel_id, context, creation_date, update_date) values ($1, $2, $3, $4, $5) RETURNING *
          `;

          // execute a query on our database
          client.query(query, [self.wid, self.user_channel.id, self.context, creation_date, update_date], function (err, result) {
            done();

            if (err) {
              console.error(err);  
              return cb(err);
            }

            var result = result.rows[0];
            self.id = result.id;

            log.info("Conversation.save() | conversation was saved");

            // ONLY FOR RETURNING USERS
            if(self.context.authenticated){

              self.restart(false, function(err){
                if(err) return callback(err);
                return callback(null, self, false);
              });

            }else{

              return cb();

            }

          });
        });

      }

    ], function(err){

      if(err) return callback(err);
      callback(null, self, true);

    });
  }

  update(callback, set_update_date){

    console.log("Conversation.update() | id =", this.id, "| wid =", this.wid);

    var self = this;
    set_update_date = (set_update_date != null)? set_update_date : true;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "UPDATE bot.conversation SET wid = $2, context = $3, update_date = $4, expired = $5, user_channel_id = $6 WHERE ID = $1 RETURNING *"
      ].join("\n");

      // Encrypt sensitive data on context

      var context = Conversation.obfuscateContext(self.context);
      var update_date = moment.tz('America/Lima').format("YYYY-MM-DD HH:mm:ss.SSSSS");

      if(!set_update_date)
        update_date = self.update_date;

      // execute a query on our database
      client.query(query, [self.id, self.wid, context, update_date, self.expired, self.user_channel.id], function (err, result) {

        done();

        if (err) {
          console.error("Conversation.update() | id =", self.id, "| error :", err);
          return callback(err);
        }

        console.log("Conversation.update() | id =", self.id, "| conversation updated");

        result = result.rows[0];
        self.id = result.id;

        callback(null, self);

      });
    });

  }

  static obfuscateContext(context){

    try{

      var context = Object.assign({}, context);
      var toProtect = ['user'];

      for (var i in context) {
        if(toProtect.indexOf(i) != -1){
          context[i] = Utils.encrypt(context[i]);
        }
      }
      return context;

    }catch(e){
        e.message = "Error while trying to encrypt conversation context";
        return context;
    }

  }

  static obfuscateContextForLog(context){
    var c = Conversation.obfuscateContext(context);
    delete c.actions_executed;
    return c;
  }

  static deobfuscateContext(context, id){

    var context = Object.assign({}, context);
   
    var toProtect = ['user'];

    for (var i in context) {
      if(toProtect.indexOf(i) != -1){
        try{
          context[i] = Utils.decrypt(context[i]);
        }catch(e){
          e.conversation_id = id;
          e.message = "Error while trying to decrypt " + i + " property from conversation context";
          e.details = "Error while trying to decrypt " + i + " property from conversation context";
        }
      }
    }

    return context;

  }

  delete(callback){

    console.log("Conversation.delete() , id = " , this.id);

    var self = this;

    async.series([

      function delete_messages(cb){

        console.log("Delete messages ...");

        self.getMessages(function(err, messages){
          if(err) return cb(err);

          async.each(messages, function(message, cb2){
            message.delete(cb2);
          }, cb);

        });

      },

      function delete_conversation(cb){

        console.log("Delete conversation ...");

        Bot.getDB().connect(function (err, client, done) {
          if (err) return cb(err);

          var query = [
            "DELETE FROM bot.conversation WHERE id = $1::int"
          ].join("\n");

          client.query(query, [self.id], function (err, result) {
            done();
            if(err) return cb(err);
            cb(null, self);
          });
        });
      }

    ], function(err){
      //console.log("Conversation.delete() , (err) :", err);
      if(err) return callback(err);
      self.id = null;
      return callback();
    });

  }

  recover(input, send_messages, messages_to_return, callback){

    var self = this;

    console.log("Conversation.recover() | input =", input, "| send_messages =", send_messages);

    var ms = [
      "¡Oops! 😨, ocurrió un problema hace un momento, procesaré tu nuevo mensaje..."
    ];

    async.series([

      function(_cb){

        self.restart(false, _cb);

      },

      function(_cb){

        var message = new Message({
          content : ms[Utils.getRandomIntInclusive(0, ms.length-1)],
          conversation : self,
          from_bot : true
        });

        if(send_messages){
          return message.send(_cb);
        }else{
          messages_to_return.push(message);
          return _cb();
        }

      },

      function(_cb){

        self.converse(input, function(err, new_messages){
          if(err) _cb(err);
          if(new_messages != null)
            messages_to_return = messages_to_return.concat(new_messages);
          return _cb();
        }, false, send_messages);

      }

    ], function(err){

      if(err) return self.onError(err, null, callback);

      if(send_messages)
        return callback();
      else
        return callback(null, messages_to_return);

    });

  }

  restart(from_conversation_start, callback){

    console.log("Conversation.restart() | Restarting conversation, from conversation_start ?:", from_conversation_start);

    var self = this;
    var from_conversation_start = (from_conversation_start != null)?from_conversation_start:false;

    self.context.system.dialog_stack = ['root'];
    self.context.state = ConversationStateTypes.WAITING;
    self.context.action_in_process = false;
    self.context.action = "none";
    self.context.intent = "none";
    self.context.step = "conversation_restart";

    if(!from_conversation_start)
      self.context.step = "conversation_in_progress";

    async.series([

      function(cb){

        self.update(function(err){
          if(err) return cb(err);
          cb();
        })

      }

    ], function(err){
      if(err) return callback(err);
      callback();
    });

  }

  getErrorMessage(error){

    if(error.keepMessage)
      return error.message;

    return this.onError(error, null, null, false, false);
  }

  onError(error, additional_message, callback, _async, _alert){

    var self = this;
    _async = (_async == null)?true : _async;
    _alert = (_alert == null)?true : _alert;

    console.log("Conversation.onError() | remote_id =", self.user_channel.remote_id, "| Error :", error);

    var _error = Object.assign({}, error);
    _error.conversation = self.id;
    _error.user = self.user_channel.user.id;
    _error.intent = self.context.intent;

    var trym = [
      "Inténtemos de nuevo 😊",
      "Por favor, inténtalo de nuevo ✌",
      "Repitamos los pasos por favor 😊"
    ];

    if(error && error.code == "ECONNREFUSED")
      error.message = "Ocurrió un error de conexión...";

    var messages = [
      error.message,
      additional_message || trym[Utils.getRandomIntInclusive(0, trym.length - 1)]
    ];

    if(!_async) return messages.join(" ");
    
    async.eachSeries(messages, function(message, cb2){

      var _message = new Message({
        content : message,
        conversation : self,
        from_bot : true
      });

      _message.send(cb2);

    }, function(err){
      self.restart(false, function(err){
        if(callback)
          return callback();
      });
    });

  }

  converse(input, callback, from_bot, send_messages){

    var messages_to_return = [];
    
    from_bot = (from_bot != null)?from_bot:false;
    send_messages = (send_messages != null)? send_messages:true;

    log.info("Conversation.converse() | remote_id =", this.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot , "| Conversation State : ", ConversationStateTypes[this.context.state]);

    var self = this;

    if(input == null)
      return callback(errors.conversations.INVALID_MESSAGE);
    else{
      input = input.trim();
      input = input.replace(/\t+/g, " ");
      input = input.replace(/\r+/g, " ");
      input = input.replace(/\n+/g, " ");

      input = input.replace(/p\.m\./g, "pm");
      input = input.replace(/a\.m\./g, "am");

      input = input.replace(/\./g, " ");
    }

    if(!from_bot){
      input = emojione.toShort(input);
    }

    async.waterfall([

      function saveInputMessage(cb){

        log.info("Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot, "| Saving message if enabled ...");

        if(!from_bot && input.length >= 150){

          var message = new Message({
            content : input.substring(0, 500),
            conversation : self,
            from_bot : from_bot,
            understood : false
          });

          message.save(function(err){
            self.context.last_input_message_id = message.id;
            self.update(function(err){
              return self.delegate(callback);
            });
          });

        }else{
          
          var message = new Message({
            content : input,
            conversation : self,
            from_bot : from_bot
          });

          message.save(function(err){
            if(err) return cb(err);
            if(!from_bot)
              self.context.last_input_message_id = message.id;
            cb(null);
          });

        }

      },

      function changeConversationState(cb){

        if(!from_bot){
          self.context.PENDING_ACTION_RESPONSE = false;
          self.context.state = ConversationStateTypes.PROCESSING;
          self.context.currentTimer = 'none';

          self.update(function(err){
            if(err) return cb(err);
            cb();
          });
        }else{

          self.context.state = ConversationStateTypes.PROCESSING;

          self.update(function(err){
            if(err) return cb(err);
            cb();
          });

        }

      },

      function process_in_AI(cb){

        if(process.env.NODE_ENV == "production")
          log.info({
            metadata : {
              "context_to_send": JSON.stringify(Conversation.obfuscateContextForLog(self.context))
            }
          }, "Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot, "| Processing in watson (workspace =" , process.env.WATSON_WORKSPACE , ")");
        else
          log.info({
            metadata : {
              "context_to_send": self.context
            }
          }, "Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot, "| Processing in watson (workspace =" , process.env.WATSON_WORKSPACE , ")");

        // Replace message from bot with an empty message
        // to avoid any entity or intent derived from the sent message.

        if(from_bot) input = FROM_BOT_TEXT;

        async.retry({
          times : process.env.CONVERSATION_REQUEST_RETRIES,
          interval : process.env.CONVERSATION_REQUEST_RETRIES_INTERVAL_IN_SECONDS
        }, function(__cb){

          Bot.getAI().conversation.message({
             input: {
              "text": input
            },
            context : self.context,
            workspace_id: process.env.WATSON_WORKSPACE
          }, function(err, response){

            if (err) {
              log.error({
                err : err
              }, "Conversation.converse() | watson ERROR : ");
              var e = errors.WATSON_ERROR;
              e.details = err;
              e.conversation_id = self.id;
              return __cb(e);
            }

            if(!response){
              var e = errors.WATSON_ERROR;
              e.conversation_id = self.id;
              return __cb(e);
            }

            // Check error in response
            if(response && response.output != null && response.output.error){
              log.info("Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot, "| Error in response output :", response.output.error);
              var e = errors.WATSON_ERROR;
              e.details = response.output.error;
              e.conversation_id = self.id;
              return __cb(e);
            }

            return __cb(null, response);

          });

        }, function(err, response) {

          if(err){
            return self.onError(err, null, callback);
          }

          // Set response context as the new context ** IMPORTANT

          if(process.env.NODE_ENV == "production"){
            log.info("Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot, "| Response context (obfuscated) :", JSON.stringify(Conversation.obfuscateContextForLog(response.context)), "| Response intents : ", response.intents, "| Response entities :", response.entities, "| Nodes visited :", response.output.nodes_visited);
          }else{
            log.info({
              metadata : {
                response : response
              }  
            }, "Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot);
          }

          self.context = response.context;
          cb(null, response);

        });

      },

      function process_response_and_send_messages(response, cb){

        log.info("Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot, "| Processing response output  ... ");

        if(!response.output)
          return cb(null, response);

        var message_contents = response.output.text;

        // Sensitive and Stext values are only applied if the first output message has it.
        // Watson returns an array of output texts if there were more than one chained with "continue from" links,
        // but we only neeed to apply these values on the first one.

        // HOT FIX : Apply sensitive response to all the response chain

        var sensitive = (response.output.sensitive != null)?response.output.sensitive:false;
        var stext = (response.output.stext != null)?response.output.stext:false;

        async.eachSeries(message_contents, function(message_content, cb2){

          var message = new Message({
            content : message_content,
            conversation : self,
            from_bot : true,
            sensitive : sensitive,
            stext : stext
          });

          // Sensitive and stext are expected to be applied on the first node only.
          //sensitive = false;
          //stext = null;

          if(send_messages){
            message.send(cb2);
          }else{
            messages_to_return.push(message);
            cb2();
          }

        }, function(err){
          if(err) return cb(err);
          cb(null, response);
        });

      },

      function update_conversation_with_response_context(response, cb){

        log.info("Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot, "| Update conversation with new context ...");

        // Process entities :
        self.context._entities = {};
        
        if(response.context.entities)
          for(var i in response.context.entities)
            self.context._entities[response.context.entities[i].entity] = { 
              value : response.context.entities[i].value,
              location : response.context.entities[i].location
            };

        // Update context 
        self.update(function(err){
          if(err) return cb(err);
          cb(null, response);
        });

      },

      function check_for_action_and_process_it(response, cb){

        var action = response.output.action;
        var action_in_process = (response.context.action_in_process != null) ? response.context.action_in_process : false;

        var recursive = false;
        
        try{
          // Added on 13/02/17
          // Here we have the important RECURSIVE parameter.
          // It TRUE by default. Where any action is called until there are no actions in the dialog node chain.
          // With false, there is expected to execute only one action.
          
          // Remember, that sometimes params is "none", so we need to check the data type.
          var params = response.action.parameters;

          if(params && params.recursive){
            recursive = params.recursive;
          }
          
          // It it's recursive, then restore its value to TRUE for an incoming next execution
          //if(!recursive)
          //  self.context.params.recursive = true;

        }catch(e){
          recursive = false;
        }

        log.info("Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot, "| Check for action and do it, action :", action,"| is there an action in process ?", action_in_process);

        // If there is no action in process
        if(action && !action_in_process){

          self.onAction(action, input, function(err, messages){
            cb(null, messages);
          }, recursive);

        }else{

          // If there is still an action in process, this message not filtered by the checkingConversationState)
          // method. Something happened that avoided the action_in_process variable update to false, because 
          // the state of the current conversation is WAITING
        
          if(action){
            log.info("Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot, "| Can't run action :", response.context.action, "because there is an action", response.context.last_action, "in process ...");
          
            // Check the last time of the action 
            // This method will force to execture the following action
            if(self.context.last_action && self.context.last_action.creation_time != undefined){
              var diff = moment.tz('America/Lima').diff(moment(self.context.last_action.creation_time), 'seconds');
              if( diff > 20){
                return self.onAction(action, input, function(err, messages){
                  cb(null, messages);
                });
              }
            }
          }
          
          // There are no action to process
          cb(null, null);

        }

      },

      function send_complementary_messages(messages, cb){

        if(messages != null){

          async.eachSeries(messages, function(message, cb2){
            if(send_messages){
              message.send(cb2);
            }else{
              messages_to_return.push(message);
              cb2();
            }
          }, function(err){
            if(err) {
              self.context.error = err;
              return cb(err);
            }

            cb();
          });

        }else{
          cb();
        }

      }

    ], function(err){

      if(err){
        log.error({
          err: err
        }, "Conversation.converse() | remote_id =", self.user_channel.remote_id, "| input =", input, "| from_bot =", from_bot);
        return self.onError(err, null, callback);
      }

      self.context.state = ConversationStateTypes.WAITING;

      self.update(function(err){
        if(err) return callback(err);
        if(send_messages)
          return callback(null, null);
        else
          return callback(null, messages_to_return);
      });

    });

  }

  getUpdated(callback){

    var self = this;

    Conversation.getById(self.id, function(err, conversation){
      if(err) return callback(err);
      conversation.context = Conversation.deobfuscateContext(conversation.context, self.id);
      return callback(null, conversation);
    });
  }

  /**
  * Process an action ordered by the watson conversation,
  * IMPORTANT : this will not modify the current context, the
  * processed context will be sent on the callback.
  **/
  onAction(action, input, callback, recursive){

    var self = this;
    var recursive = (recursive != null)? recursive : true;

    console.log("Conversation.onAction() | remote_id =", self.user_channel.remote_id, "| input =", input, "| Saving action", action, "in context, setting an id =", self.context.sequence_action_index);

    self.context.action_in_process = true;
    self.context.sequence_action_index = (self.context.sequence_action_index == null)? 0 : self.context.sequence_action_index+1;
    self.context.error = "none";

    self.context.last_action = {
      name : action,
      index : self.context.sequence_action_index,
      creation_time : moment.tz('America/Lima').format("YYYY-MM-DD HH:mm:ss.SSSSS"),
      cancelled : false,
      finished : false
    };

    var messages = [];

    async.waterfall([
 
      // Update context on DB before running the action

      function update_context(cb){

        self.update(function(err){

          console.log("Conversation.onAction() | remote_id =", self.user_channel.remote_id, "| input =", input, "| Context updated with actions ...");

          if(err) {
            self.context.action_in_process = false;
            return cb(err);
          }

          cb(null);
        });
        
      },

      // Run action 

      function run_action(cb){

        Action.run(action, self, function(err, context_after_action, _messages){
          
          try{

            if(err){
              context_after_action.error = {
                message : self.getErrorMessage(err)
              };
            }else{
              context_after_action.error = "none";
            }

            context_after_action.action_in_process = false;
            context_after_action.last_action.finished = true;

          }catch(e){

            console.error(e);

            console.log("Conversation.onAction() | remote_id =", self.user_channel.remote_id, "| input =", input, "| An error was captured while action was processed and context changed :", e);

            context_after_action.error = errors.PROCESS_ERROR;
            context_after_action.error.message = self.getErrorMessage(errors.PROCESS_ERROR);
            context_after_action.action_in_process = false;
            context_after_action.last_action.finished = true;

          }

          messages = _messages || [];

          console.log("Conversation.onAction() | remote_id =", self.user_channel.remote_id, "| input =", input, "| Action processed :", context_after_action.last_action, "| New Messages : ", messages.length);

          cb(null, context_after_action);

        });

      },

      // Get last context

      function get_last_context(context_after_action, cb){

        console.log("Conversation.onAction() | remote_id =", self.user_channel.remote_id, "| input =", input, "| Action processed :", context_after_action.last_action, "| Getting updated context ...");

        self.getContext(function(err2, _context){

          if(err2) return cb(err2);

          console.log("Conversation.onAction() | remote_id =", self.user_channel.remote_id, "| input =", input, "| Action processed :", context_after_action.last_action, "| Comparing the updated _context's last_action with the context used 's last_action");

          if((_context.last_action.id != context_after_action.last_action.id) || ((_context.last_action.id == context_after_action.last_action.id) && _context.last_action.cancelled)) {
            console.log("Conversation.onAction() | remote_id =", self.user_channel.remote_id, "| input =", input, "| Action processed :", context_after_action.last_action, "was cancelled, don't process its response ...");
           
            // The current result is from an action that was cancelled, ignore it.
            return cb(null, messages);
          }
          
          // Set context to conversation
          self.context = context_after_action;

          return cb(null, messages);
          
        });

      },

      // Return results to watson conversation if it's recursived

      function return_result_to_watson_conversation_if_it_is_recursive(messages, cb){

        console.log("Conversation.onAction() | remote_id =", self.user_channel.remote_id, "| input =", input, "| Action processed and context changed ...");
        
        if(recursive){

          var mlog = 'ACTION "' + action.name + '" was processed ...';

          self.converse(mlog, function(err, new_messages){
            // the error is handled by the conversation context
            if(new_messages != null)
              messages = messages.concat(new_messages);
            return cb(null, messages);
          }, true, false); // <-- don't send messages, just collect it to send with the current messages array

        }else{
          cb(null, messages);
        }

      }

    ], function(err, messages){
      return callback(null, messages);
    });

  }

  getMessages(callback){

    var Message = require("./Message");

    Message.getByConversation(this, function(err, messages){
      if(err) return callback(err);
      return callback(null, messages);
    });

  }

  getContext(callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = [
        "SELECT ",
        " context FROM bot.conversation",
        " WHERE id = $1"
      ].join("\n");

      client.query(query, [self.id], function (err, result) {

        done();

        if (err) {
          console.log("Conversation.getContext() | conversation.id = " , self.id , "| error :", err);
          return callback(err);
        }

        if(result.rows.length == 0){
          return callback(errors.conversations.NOT_FOUND);
        }

        var context = Conversation.deobfuscateContext(result.rows[0].context, self.id);
        callback(null, context);
      });
    });

  }

  static getById(id, callback){

    console.log("Conversation.getById() | id = " , id);

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT 
         c.*, uc.user_id as uc_user_id, 
         
         u.name as uc_user_name, 
         u.accepted_terms as uc_user_accepted_terms, 
         u.registered as uc_user_registered, 
         u.birth_date as uc_user_birth_date, 
         u.gender as uc_user_gender,
         u.segment as uc_user_segment,
         u.role as uc_user_role,

         uc.channel_id as uc_channel_id, 
         uc.metadata as uc_metadata, 
         uc.remote_id as uc_remote_id,
         uc.state as uc_state, 
         cc.name as uc_channel_name, 
         uc.id as uc_id 
         
         FROM bot.conversation c 
         JOIN bot.user_channel uc on c.user_channel_id = uc.id
         JOIN bot.channel cc on cc.id = uc.channel_id
         JOIN bot.user u on uc.user_id = u.id
         WHERE c.id = $1
      `;

      client.query(query, [id], function (err, result) {

        done();

        if (err) {
          console.log("Conversation.getById() | id = " , id , "| error :", err);
          return callback(err);
        }

        console.log("Conversation.getById() | id = " , id , "| result returned ...");

        if(result.rows.length == 0){
          return callback(errors.conversations.NOT_FOUND);
        }

        var conversation = Conversation.fromRow(result.rows[0], false);
        callback(null, conversation);
      });
    });

  }

  static getByUserChannel(user_channel, callback){

    console.log("Conversation.getByUserChannel() | user_channel = " , user_channel.id);

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT 
         c.*, uc.user_id as uc_user_id, 
         
         u.name as uc_user_name, 
         u.accepted_terms as uc_user_accepted_terms, 
         u.registered as uc_user_registered, 
         u.birth_date as uc_user_birth_date, 
         u.gender as uc_user_gender,
         u.segment as uc_user_segment,
         u.role as uc_user_role,

         uc.channel_id as uc_channel_id, 
         uc.metadata as uc_metadata, 
         uc.remote_id as uc_remote_id, 
         uc.state as uc_state, 
         cc.name as uc_channel_name, 
         uc.id as uc_id 
         
         FROM bot.conversation c 
         JOIN bot.user_channel uc on c.user_channel_id = uc.id
         JOIN bot.channel cc on cc.id = uc.channel_id
         JOIN bot.user u on uc.user_id = u.id
         WHERE c.user_channel_id = $1 AND c.expired = FALSE ORDER BY c.update_date
      `;

      client.query(query, [user_channel.id], function (err, result) {

        done();

        if (err) {
          console.log("Conversation.getByUserChannel() | user_channel = " , user_channel.id , "| error :", err);
          return callback(err);
        }

        console.log("Conversation.getByUserChannel() | user_channel = " , user_channel.id , "| result returned ...");

        if(result.rows.length == 0){
          return callback(errors.conversations.NOT_FOUND);
        }

        var conversation = Conversation.fromRow(result.rows[0]);
        callback(null, conversation);
      });
    });

  }

  static getLastByUserChannel(user_channel, callback){

    console.log("Conversation.getLastByUserChannel() | user_channel = " , user_channel.id);

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

      var query = `
        SELECT 
         c.*, uc.user_id as uc_user_id,

         u.name as uc_user_name, 
         u.accepted_terms as uc_user_accepted_terms, 
         u.registered as uc_user_registered, 
         u.birth_date as uc_user_birth_date, 
         u.gender as uc_user_gender,
         u.segment as uc_user_segment,
         u.role as uc_user_role,

         uc.channel_id as uc_channel_id, 
         uc.metadata as uc_metadata, 
         uc.remote_id as uc_remote_id, 
         uc.state as uc_state, 
         cc.name as uc_channel_name, 
         uc.id as uc_id 

         FROM bot.conversation c 
         JOIN bot.user_channel uc on c.user_channel_id = uc.id
         JOIN bot.channel cc on cc.id = uc.channel_id
         JOIN bot.user u on uc.user_id = u.id

         WHERE c.user_channel_id = $1 ORDER BY c.update_date IS NULL ASC , c.update_date DESC
      `;

      client.query(query, [user_channel.id], function (err, result) {

        done();

        if (err) {
          console.log("Conversation.getLastByUserChannel() | user_channel = " , user_channel.id , "| error :", err);
          return callback(err);
        }

        console.log("Conversation.getLastByUserChannel() | user_channel = " , user_channel.id , "| result returned ...");

        if(result.rows.length == 0){
          return callback(errors.conversations.NOT_FOUND);
        }

        var conversation = Conversation.fromRow(result.rows[0]);
        callback(null, conversation);
      });
    });

  }

  static getByTimeDistance(minutes, callback){

    var self = this;

    Bot.getDB().connect(function (err, client, done) {
      if (err) return callback(err);

       var query = `
        SELECT 
         c.*, uc.user_id as uc_user_id, 
         
         u.name as uc_user_name, 
         u.accepted_terms as uc_user_accepted_terms, 
         u.registered as uc_user_registered, 
         u.birth_date as uc_user_birth_date, 
         u.gender as uc_user_gender,
         u.segment as uc_user_segment,
         u.role as uc_user_role,

         uc.channel_id as uc_channel_id, 
         uc.metadata as uc_metadata, 
         uc.remote_id as uc_remote_id, 
         cc.name as uc_channel_name, 
         uc.id as uc_id 

         FROM bot.conversation c 
         JOIN bot.user_channel uc on c.user_channel_id = uc.id
         JOIN bot.channel cc on cc.id = uc.channel_id
         JOIN bot.user u on uc.user_id = u.id
         WHERE $2::time < ($1::timestamp without time zone - c.update_date) AND c.expired != TRUE
      `;

      var distance = parseInt(minutes/60) + ":" + (minutes % 60) + ":00";
      var now = moment.tz('America/Lima').format("YYYY-MM-DD HH:mm:ss.SSSSS");

      client.query(query, [now, distance], function (err, result) {

        done();

        if (err) {
          console.log("Conversation.getByTimeDistance() | conversation.id = " , self.id , "| error :", err);
          return callback(err);
        }

        var conversations = result.rows.map(function(row){
          return Conversation.fromRow(row);
        });

        callback(null, conversations);
      });
    });

  }

  static getOrCreate(conversation, callback){

    // Search conversation

    Conversation.getByUserChannel(conversation.user_channel, function(err, _conversation){
      if(err){
        if(err.code == errors.conversations.NOT_FOUND.code){
          return Conversation.getLastByUserChannel(conversation.user_channel, function(err, _last_conversation){
            if(err){
              if(err.code == errors.conversations.NOT_FOUND.code){
                // Create conversation
                // conversation should have and user_channel as property
                return conversation.save(callback);
              }
              return callback(err);
            }

            conversation.wid = _last_conversation.wid;
            conversation.context = _last_conversation.context;

            conversation.duplicate(callback);
          });
        }else{
          return callback(err);
        }
      }

      callback(null, _conversation);

    });

  }

  static fromRow(row, deobfuscated){

    var User = require("./User");
    var Channel = require("./Channel");
    var UserChannel = require("./UserChannel");

    var deobfuscated = (deobfuscated != null) ? deobfuscated : true;

    var user_channel = new UserChannel({
        id : row.uc_id,
        user : new User({
          id : row.uc_user_id,
          name : row.uc_user_name,
          accepted_terms : row.uc_user_accepted_terms,
          registered : row.uc_user_registered,
          birth_date : row.uc_user_birth_date,
          segment : row.uc_user_segment,
          gender : row.uc_user_gender,
          role : row.uc_user_role
        }),
        channel : new Channel({
          id : row.uc_channel_id,
          name : row.uc_channel_name
        }),
        metadata : row.uc_metadata,
        remote_id : row.uc_remote_id,
        state : row.uc_state
    });

    var conversation = new Conversation({
      user_channel : user_channel,
      context : (deobfuscated) ? Conversation.deobfuscateContext(row.context, row.id) : row.context,
      id : row.id,
      wid : row.wid,
      expired : row.expired,
      update_date : row.update_date,
      creation_date : row.creation_date
    });

    return conversation;

  }

};
