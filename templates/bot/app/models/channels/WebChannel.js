"use strict";

var request = require('request');
var async = require("async");
var moment = require("moment-timezone");
var Utils = require("./../../../utils/Utils");
var errors = require("./../../../utils/errors");

class WebChannel {

    /**
     * 
     * 
     * @static
     * @param {Message} message 
     * @param {Function} callback 
     * @memberof WebChannel
     */
    static send(message, callback){

        callback();

    }

}

module.exports = WebChannel;