"use strict";

var Bot = require("./../../Bot");
var Message = require('./Message');
var Utils = require("./../../utils/Utils");
var moment = require("moment");
var FROM_BOT_TEXT = "[[/FROM_BOT/]]";

var log = global.log.child({
  module : "models/Action.js"
});

module.exports = class Action {

  static run(action, conversation, callback){

    console.log("Conversation.onAction() | remote_id =", conversation.user_channel.remote_id, "| action =", action);

    var context = Object.assign({}, conversation.context);
    var params = action.parameters || {};

    var messages = [];

    try {

      switch(action.name){

        case "show_options":

          // Transform options
          var options = params.options;
          
          var message = new Message({
            comment : params.comment || "[Se muestran opciones]",
            delay : params.delay || 0,
            from_bot : true,
            type : params.type || "options",
            data : {
              options : params.options
            },
            conversation : conversation
          });

          messages.push(message);

          break;

        case "show_time" :

          console.log("Conversation.onAction() | remote_id =", conversation.user_channel.remote_id, "| action =", action);

          var message = new Message({
            content : 'Son las ' + moment.tz('America/Bogota').format("HH:mm:ss [del] DD-MM-YYYY"),
            from_bot : true,
            conversation : conversation
          });

          messages.push(message);

          break;

        case "show_version":

          console.log("Conversation.onAction() | remote_id =", conversation.user_channel.remote_id, "| action =", action);

          var message = new Message({
            content : 'La versión actual es la ' + process.env.VERSION,
            from_bot : true,
            conversation : conversation
          });

          messages.push(message);

          break;

        case "show_url":

          var message = new Message({
            comment : "[Se muestran opciones]",
            delay : 0,
            type : "url",
            from_bot : true,
            data : {
              url: "http://www.devniel.com/",
              title: "My blog",
              label: "devniel",
              description: "Devniel's blog"
            },
            conversation : conversation
          });

          messages.push(message);

          break;
        
        default:
            return callback(null, context, messages);

      }

      return callback(null, context, messages);      

    }catch(e){

      log.error({
        err : e
      }, "Error while processing action");

      return callback(e, context);

    }

  }

}
