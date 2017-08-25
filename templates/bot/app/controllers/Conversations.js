"use strict"

var async = require("async");
var UserChannel = require("./../models/UserChannel");
var Conversation = require("./../models/Conversation");
var validator = require("validator");

var Utils = require("./../../utils/Utils");
var errors = require("./../../utils/errors");

var _ = require("lodash");

module.exports = class Conversations {

  /**
   * GET /conversations/:id
   * @param  {Object} req
   * @param  {Object} res
   * @return {undefined}
   */
  static read(req, res, next) {

    console.log("Conversations.read() ", req.params.id);

    if(!validator.isInt(req.params.id)){
      return Utils.handleError(req, res, errors.conversations.INVALID_ID, 400);
    }

    Conversation.getById(req.params.id, function(err, idc){
      if(err) return Utils.handleError(req, res, err, 404);
      res.json(idc.toJSON());
    });

  }

  /**
   * PUT /conversation/:id
   * @param  {Object} req
   * @param  {Object} res
   * @return {undefined}
   */
  static update(req, res, next) {

    console.log("Conversation.update");

    console.log("req.body : ", req.body);

    if(!validator.isInt(req.params.id)){
      return Utils.handleError(req, res, errors.conversations.INVALID_ID, 400);
    }

    if(!req.body){
      return Utils.handleError(req, res, errors.conversations.INVALID_DATA, 500);
    }

    var data = req.body;

    Conversation.getById(req.params.id, function(err, conversation){
      if(err) return Utils.handleError(req, res, err);
      conversation.context = (data.context != null) ? data.context : conversation.context;
      conversation.save(function(err){
        if(err) return Utils.handleError(req, res, err);
        res.json(conversation.toJSON());
      })
    });
    
  }

  /**
   * DELETE /conversations/:id
   * @param  {Object} req
   * @param  {Object} res
   * @return {undefined}
   */
  static delete(req, res, next) {

    console.log("Conversations.delete");

    if(!validator.isInt(req.params.id)){
      return Utils.handleError(req, res, errors.identity_documents.INVALID_ID, 400);
    }

    Conversation.delete(req.params.id, function(error){
      if(error) return Utils.handleError(req, res, error);
      res.status(200).end();
    });

  }

  static search(req, res, next){

    console.log("Conversations.search ()", req.query);

    var query = req.query.query;
    var page = req.query.page || 0;
    var quantity = req.query.quantity || 20;

    if(!validator.isInt(page.toString())){
      return Utils.handleError(req, res, errors.identity_documents.INVALID_PAGE, 400);
    }

    if(!validator.isInt(quantity.toString())){
      return Utils.handleError(req, res, errors.identity_documents.INVALID_QUANTITY, 400);
    }

    async.waterfall([

      function(cb){

        Conversation.search(query, page, quantity, function(error, _idcs){
          if(error) return cb(error);         
          var idcs = _idcs.map(function(idc){
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

        Conversation.countByQuery(query, function(error, total){
          if(error) return cb(error);
          response.total = total;
          cb(null, response);
        })
      }

    ], function(error, response){
      if(error) return Utils.handleError(req, res, error);
      res.json(response);
    });

  }

  /**
   * GET /conversations
   * @param  {Object} req
   * @param  {Object} res
   * @return {undefined}
   */
  static list(req, res, next){

    console.log("Conversations.list ()", req.query);

    var page = req.query.page || 0;
    var quantity = req.query.quantity || 20;

    if(!validator.isInt(page.toString())){
      return Utils.handleError(req, res, errors.identity_documents.INVALID_PAGE, 400);
    }

    if(!validator.isInt(quantity.toString())){
      return Utils.handleError(req, res, errors.identity_documents.INVALID_QUANTITY, 400);
    }

    async.waterfall([

      function(cb){

        Conversation.list(page, quantity, function(error, conversations){
          if(error) return cb(error);
          conversations = conversations.map(function(conversation){
            return conversation.toJSON();
          });
          return cb(null, conversations);
        });
      },

      function(conversations, cb){

        var response = {
          page : page,
          quantity : quantity,
          data : conversations
        };

        Conversation.count(function(err, total){
          if(err) return cb(err);
          response.total = total;
          cb(null, response);
        })

      }

    ], function(error, response){
      if(error) return Utils.handleError(req, res, error);
      res.json(response);
    });

  }

  /**
   * GET /conversations/count
   * @param  {Object} req
   * @param  {Object} res
   * @return {undefined}
   */
  static count (req, res, next) {

    console.log("Conversations.count");

    Conversation.count(function(error, total){
      if(error) return Utils.handleError(req, res, error);
      console.log("Conversations.count results : ", total);
      res.json({
        total : total
      });
    });

  }

  static restartOrCreate(sender_id, channel, callback){

    console.log("Conversations | Conversations.restartOrCreate | sender_id = ", sender_id , " | channel with id = ", channel.id );

    async.waterfall([

      function(cb){

        console.log("Conversations | Conversations.restartOrCreate | sender_id = ", sender_id , " ### UserChannel.getByRemoteIdAndChannelOrCreate() ");

        UserChannel.getByRemoteIdAndChannelOrCreate(sender_id, channel, cb);
      },

      function(user_channel, cb){

        console.log("Conversations | Conversations.restartOrCreate | sender_id = ", sender_id , " ### Conversation.getOrCreate() ");

        var conversation = new Conversation({
          user_channel : user_channel
        });

        Conversation.getOrCreate(conversation, function(err, _conversation){
          if(err) return cb(err);
          cb(null, _conversation);
        });

      },

      function(conversation, cb){

        conversation.restart(true, function(err){
          if(err) return cb(err);
          console.log("Conversations | Conversations.restartOrCreate | sender_id = ", sender_id , " ### A conversation with id ", conversation.id , " was created and/or restarted , converse now ... ");
          conversation.converse("ACTION for sender with id " + sender_id + " : NEW CONVERSATION PAYLOAD", cb, true);
        });

      }

    ], function(err){
      if(err) return callback(err);
      callback(null);
    });

  }

  static restartAndProcessIntent(sender_id, channel, intent, callback){

    console.log("Conversations | Conversations.processIntent | sender_id = ", sender_id , " | channel with id = ", channel.id , " | intent = ", intent );

    async.waterfall([

      function(cb){

        console.log("Conversations | Conversations.processIntent | sender_id = ", sender_id , " | channel with id = ", channel.id, " | intent = ", intent, " ### UserChannel.getByRemoteIdAndChannelOrCreate() ");

        UserChannel.getByRemoteIdAndChannelOrCreate(sender_id, channel, cb);

      },

      function(user_channel, cb){

        console.log("Conversations | Conversations.processIntent | sender_id = ", sender_id , " | channel with id = ", channel.id, " | intent = ", intent, " ### Conversation.getOrCreate() ");

        var conversation = new Conversation({
          user_channel : user_channel
        });

        Conversation.getOrCreate(conversation, function(err, _conversation){
          if(err) return cb(err);
          cb(null, _conversation);
        });

      },

      function(conversation, cb){

        conversation.restart(true, function(err){
          if(err) return cb(err);
          cb(null, conversation);
        });

      },

      function(conversation, cb){

        console.log("Conversations | Conversations.processIntent | sender_id = ", sender_id , " | channel with id = ", channel.id, " | intent = ", intent, " ### A conversation with id ", conversation.id , " was resumed or created, converse.convers() now ... ");

        conversation.context.intent = intent;
        conversation.context.intent_set_by_buttons = true;
        conversation.converse("ACTION for sender with id " + sender_id + " : Set context.intent = " + intent, cb, true);

      }

    ], function(err){
      if(err) return callback(err);
      callback(null);
    });

  }

  static processIntent(sender_id, channel, intent, callback){

    console.log("Conversations | Conversations.processIntent | sender_id = ", sender_id , " | channel with id = ", channel.id , " | intent = ", intent );

    async.waterfall([

      function(cb){

        console.log("Conversations | Conversations.processIntent | sender_id = ", sender_id , " | channel with id = ", channel.id, " | intent = ", intent, " ### UserChannel.getByRemoteIdAndChannelOrCreate() ");

        UserChannel.getByRemoteIdAndChannelOrCreate(sender_id, channel, cb);

      },

      function(user_channel, cb){

        console.log("Conversations | Conversations.processIntent | sender_id = ", sender_id , " | channel with id = ", channel.id, " | intent = ", intent, " ### Conversation.getOrCreate() ");

        var conversation = new Conversation({
          user_channel : user_channel
        });

        Conversation.getOrCreate(conversation, function(err, _conversation){
          if(err) return cb(err);
          cb(null, _conversation);
        });

      },

      function(conversation, cb){

        console.log("Conversations | Conversations.processIntent | sender_id = ", sender_id , " | channel with id = ", channel.id, " | intent = ", intent, " ### A conversation with id ", conversation.id , " was resumed or created, converse.convers() now ... ");

        conversation.context.intent = intent;
        conversation.context.intent_set_by_buttons = true;
        conversation.converse("ACTION for sender with id " + sender_id + " : Set context.intent = " + intent, cb, true);

      }

    ], function(err){
      if(err) return callback(err);
      callback(null);
    });

  }

  static processInput(sender_id, channel, input, callback){

    console.log("Conversations | Conversations.processInput | sender_id = ", sender_id , " | channel with id = ", channel.id , " | input = ", input );

    async.waterfall([

      function(cb){

        console.log("Conversations | Conversations.processInput | sender_id = ", sender_id , " | channel with id = ", channel.id, " | input = ", input, " ### UserChannel.getByRemoteIdAndChannelOrCreate() ");

        UserChannel.getByRemoteIdAndChannelOrCreate(sender_id, channel, cb);

      },

      function(user_channel, cb){

        console.log("Conversations | Conversations.processInput | sender_id = ", sender_id , " | channel with id = ", channel.id, " | input = ", input, " ### Conversation.getOrCreate() ");

        var conversation = new Conversation({
          user_channel : user_channel
        });

        Conversation.getOrCreate(conversation, function(err, _conversation){
          if(err) return cb(err);
          cb(null, _conversation);
        });

      },

      function(conversation, cb){

        console.log("Conversations | Conversations.processInput | sender_id = ", sender_id , " | channel with id = ", channel.id, " | input = ", input, " ### A conversation with id ", conversation.id , " was resumed or created, converse.convers() now ... ");
        conversation.converse(input, cb);

      }

    ], function(err){
      if(err) return callback(err);
      callback(null);
    });

  }

  static processIntentWithData(sender_id, channel, intent, data, callback){

    console.log("Conversations | Conversations.processIntentWithData | sender_id = ", sender_id , " | channel with id = ", channel.id , " | intent = ", intent );

    async.waterfall([

      function(cb){

        console.log("Conversations | Conversations.processIntentWithData | sender_id = ", sender_id , " | channel with id = ", channel.id, " | intent = ", intent, " ### UserChannel.getByRemoteIdAndChannelOrCreate() ");

        UserChannel.getByRemoteIdAndChannelOrCreate(sender_id, channel, cb);

      },

      function(user_channel, cb){

        console.log("Conversations | Conversations.processIntentWithData | sender_id = ", sender_id , " | channel with id = ", channel.id, " | intent = ", intent, " ### Conversation.getOrCreate() ");

        var conversation = new Conversation({
          user_channel : user_channel
        });

        Conversation.getOrCreate(conversation, function(err, _conversation){
          if(err) return cb(err);
          cb(null, _conversation);
        });

      },

      function(conversation, cb){

        console.log("Conversations | Conversations.processIntentWithData | sender_id = ", sender_id , " | channel with id = ", channel.id, " | intent = ", intent, " ### A conversation with id ", conversation.id , " was resumed or created, converse.convers() now ... ");

        conversation.context.intent = intent;
        conversation.context = _.merge(conversation.context, data);
        conversation.context.intent_set_by_buttons = true;
        conversation.converse("ACTION for sender with id " + sender_id + " : Set context.intent = " + intent, cb, true);

      }

    ], function(err){
      if(err) return callback(err);
      callback(null);
    });

  }

  static processData(sender_id, channel, data, callback){

    console.log("Conversations | Conversations.processData | sender_id = ", sender_id , " | channel with id = ", channel.id , " | data = ", data );

    async.waterfall([

      function(cb){

        console.log("Conversations | Conversations.processData | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data = ", data, " ### UserChannel.getByRemoteIdAndChannelOrCreate() ");
        UserChannel.getByRemoteIdAndChannelOrCreate(sender_id, channel, cb);

      },

      function(user_channel, cb){

        console.log("Conversations | Conversations.processData | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data = ", data, " ### Conversation.getOrCreate() ");

        var conversation = new Conversation({
          user_channel : user_channel
        });

        Conversation.getOrCreate(conversation, function(err, _conversation){
          if(err) return cb(err);
          cb(null, _conversation);
        });

      },

      function(conversation, cb){

        console.log("Conversations | Conversations.processData | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data = ", data, " ### A conversation with id ", conversation.id , " was resumed or created, converse.convers() now ... ");
        conversation.context = _.merge(conversation.context, data);
        conversation.converse("ACTION for sender with id " + sender_id + " : merge data on context = " + JSON.stringify(data), cb, true);

      }

    ], function(err){
      if(err) return callback(err);
      callback(null);
    });

  }

  static processOption(sender_id, channel, data, callback){

    console.log("Conversations | Conversations.processOption | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event);

    async.waterfall([

      function(cb){

        console.log("Conversations | Conversations.processOption | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event, " ### UserChannel.getByRemoteIdAndChannelOrCreate() ");
        UserChannel.getByRemoteIdAndChannelOrCreate(sender_id, channel, cb);

      },

      function(user_channel, cb){

        console.log("Conversations | Conversations.processOption | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event, " ### Conversation.getOrCreate() ");

        var conversation = new Conversation({
          user_channel : user_channel
        });

        Conversation.getOrCreate(conversation, function(err, _conversation){
          if(err) return cb(err);
          cb(null, _conversation);
        });

      },

      function(conversation, cb){

        console.log("Conversations | Conversations.processOption | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event, " ### A conversation with id ", conversation.id , " was resumed or created, converse.onEvent() now ... ");
        conversation.onEvent(data.event, data.data, callback);

      }

    ], function(err){
      if(err) return callback(err);
      callback(null);
    });
    
  }

  static processAction(sender_id, channel, data, callback){

    console.log("Conversations | Conversations.processAction | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event);

    async.waterfall([

      function(cb){

        console.log("Conversations | Conversations.processAction | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event, " ### UserChannel.getByRemoteIdAndChannelOrCreate() ");
        UserChannel.getByRemoteIdAndChannelOrCreate(sender_id, channel, cb);

      },

      function(user_channel, cb){

        console.log("Conversations | Conversations.processAction | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event, " ### Conversation.getOrCreate() ");

        var conversation = new Conversation({
          user_channel : user_channel
        });

        Conversation.getOrCreate(conversation, function(err, _conversation){
          if(err) return cb(err);
          cb(null, _conversation);
        });

      },

      function(conversation, cb){

        console.log("Conversations | Conversations.processAction | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event, " ### A conversation with id ", conversation.id , " was resumed or created, converse.onEvent() now ... ");
        
        conversation.context = _.merge(conversation.context, data.data);        
        conversation.onDirectAction(data.action, cb);

      }

    ], function(err){
      if(err) return callback(err);
      callback(null);
    });
    
  }

  static processActionWithoutUpdatingContext(sender_id, channel, data, callback){

    console.log("Conversations | Conversations.processActionWithoutUpdatingContext | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event);

    async.waterfall([

      function(cb){

        console.log("Conversations | Conversations.processActionWithoutUpdatingContext | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event, " ### UserChannel.getByRemoteIdAndChannelOrCreate() ");
        UserChannel.getByRemoteIdAndChannelOrCreate(sender_id, channel, cb);

      },

      function(user_channel, cb){

        console.log("Conversations | Conversations.processActionWithoutUpdatingContext | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event, " ### Conversation.getOrCreate() ");

        var conversation = new Conversation({
          user_channel : user_channel
        });

        Conversation.getOrCreate(conversation, function(err, _conversation){
          if(err) return cb(err);
          cb(null, _conversation);
        });

      },

      function(conversation, cb){

        console.log("Conversations | Conversations.processActionWithoutUpdatingContext | sender_id = ", sender_id , " | channel with id = ", channel.id, " | data.event = ", data.event, " ### A conversation with id ", conversation.id , " was resumed or created, converse.onEvent() now ... ");
        
        conversation.onDirectActionWithParams(data.action, data.data.params, cb);

      }

    ], function(err){
      if(err) return callback(err);
      callback(null);
    });
    
  }
}
