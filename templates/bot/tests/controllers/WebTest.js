var supertest = require("supertest");
var assert = require('chai').assert;
var should = require('should');
var Bot = require("./../../serverTest.js").Bot;

var log = require("bunyan").createLogger({
	name : "WebTest.test.js",
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
		}
	}
});

var request = null;
const WEB_API_ENDPOINT = "/api/channels/web";

describe('Web', function(){

    this.timeout(0);

    before(function(done){
        
        Bot.start(function(err){
            if (err) {
                log.error(err);
                return done(err);
            }
            request = supertest(Bot.server);
            done();
        });

    });

    it('should return the version', function(done){

        request.get(
            WEB_API_ENDPOINT + '/version'
        ).
        expect(200).
        end(function(err, res) {
            if(err) return done(err);
            res.should.have.property('body');
            res.body.should.have.property('data');
            res.body.data.should.have.property('version');
            done();
        });

    });

    it('should receive an initial greeting', function(done){

        request.post(
            WEB_API_ENDPOINT + '/query'
        ).
        send({
            query : "hola"
        }).
        expect(200).
        end(function(err, res) {
            if(err) return done(err);
            res.should.have.property('body');
            res.body.should.have.property('data');
            log.info({
                "res.body" : res.body
            });
            done();
        });

    });

    it('should receive the available options', function(done){
        
        request.post(
            WEB_API_ENDPOINT + '/query'
        ).
        send({
            query : "qué opciones tienes"
        }).
        expect(200).
        end(function(err, res) {
            if(err) return done(err);
            res.should.have.property('body');
            res.body.should.have.property('data');
            log.info({
                "res.body" : res.body
            });
            done();
        });

    });

});