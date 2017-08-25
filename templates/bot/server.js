var express = require("express"),
    path = require('path'),
    watson = require('watson-developer-cloud'),
    pg = require("pg"),
    async = require("async"),
    Utils = require("./utils/Utils"),
    bunyan = require("bunyan");

global.version = { "code": "alpha" };
global.rootDirectory = path.resolve(__dirname);


if(process.env.NODE_ENV == null || process.env.NODE_ENV == "development"){  
  require('dotenv').config({
    path : global.rootDirectory + "/.development.env"
  });
}

if(process.env.NODE_ENV == "testing"){
  require('dotenv').config({
    path : global.rootDirectory + "/.testing.env"
  });
}

if(process.env.NODE_ENV == "production"){
  require('dotenv').config({
    path : global.rootDirectory + "/.env"
  });
}

/**
 * Log
 */ 

global.log = module.exports.log = bunyan.createLogger({
	name : process.env.NODE_ENV,
	level : "debug",
	serializers : {
		metadata : function(metadata) {
			return JSON.stringify(metadata, null, 2);
		},
		params : function(params) {
			return JSON.stringify(params, null, 2);
		},
		db_results : function(db_results){
			return JSON.stringify(db_results, null, 2);
		},
		err : bunyan.stdSerializers.err
	}
});

var log = global.log.child({module : "server.js"});

/**
 * Cloud Foundry Environment Variables
 **/

global.vcapApp = {};

try {
  global.vcapApp = JSON.parse(process.env.VCAP_APPLICATION);
}catch(e){
  global.vcapApp.instance_index = 0;
}

/**
 * Watson Conversation Configuration
 **/

var ConversationV1 = require('watson-developer-cloud/conversation/v1');

/**
 * PostgreSQL Client Configuration
 **/

var ca = (process.env.NODE_ENV == "production") ? new Buffer(process.env.PG_CA, 'base64') : null;

var config = {
  host: process.env.PG_HOST,
  user: process.env.PG_USER, //env var: PGUSER
  database: process.env.PG_DATABASE, //env var: PGDATABASE
  password: process.env.PG_PASSWORD, //env var: PGPASSWORD
  port: process.env.PG_PORT, //env var: PGPORT
  max: 100, // max number of clients in the pool
  idleTimeoutMillis: 5000, // how long a client is allowed to remain idle before being closed
  ssl: {
    rejectUnauthorized: false,
    ca: ca
  }
};

if(process.env.NODE_ENV != "production")
  delete config.ssl;

// To avoid the default conversation of timestamps to local timezone of the pg client

var types = pg.types
var moment = require('moment-timezone');
var TIMESTAMPTZ_OID = 1184;
var TIMESTAMP_OID = 1114;
var parseFn = function (val) {
  return val === null ? null : val;
}

types.setTypeParser(TIMESTAMPTZ_OID, parseFn);
types.setTypeParser(TIMESTAMP_OID, parseFn);

/**
 * From node-postgres documentation :
 * this initializes a connection pool
 * it will keep idle connections open for a 30 seconds
 * and set a limit of maximum 10 idle clients
 **/

var db = module.exports.db = new pg.Pool(config);

db.on('error', function (err, client) {
  // if an error is encountered by a client while it sits idle in the pool
  // the pool itself will emit an error event with both the error and
  // the client which emitted the original error
  // this is a rare occurrence but can happen if there is a network partition
  // between your application and the database, the database restarts, etc.
  // and so you might want to handle it and at least log it out
  if (err) {
    console.error('idle client error', err.message, err.stack)
  }
})

/**
 * General Error Handling
 */

process.on('uncaughtException', function (err) {
  console.error(err);
});

/**
 * Bot Configuration and Start
 **/

var Bot = module.exports.Bot = global.Bot = require("./Bot");

Bot.setup({
  db: db,
  ai: {
    conversation:  new ConversationV1({
      username: process.env.WATSON_USERNAME,
      password: process.env.WATSON_PASSWORD,
      version_date: ConversationV1.VERSION_DATE_2017_04_21
    })
  },
  channels: [{
    name: "facebook",
    enabled: true
  }, {
    name: "web",
    enabled: true
  }, {
    name: "twitter",
    enabled: true
  }]
});

/**
 * BCPBot Start up
 **/

if(process.env.NODE_ENV != "testing"){
  Bot.start(function (err, server) {
    if (err) throw err;
  });
}