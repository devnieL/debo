var logger = require('morgan');
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var compress = require('compression');

var xhub = require('express-x-hub');
var cors = require('cors');

module.exports = function(server) {

	server.use(xhub({
		algorithm: 'sha1',
		secret: process.env.FACEBOOK_APP_SECRET
	}));

	server.use(compress());

	/*======================================
	Express Configuration
	=========================================*/

	server.set('showStackError', true);
	server.use(logger('tiny'));
	server.use(bodyParser.json());
	server.use(methodOverride());

	server.use(bodyParser.urlencoded({
		extended: true
	}));

	var corsOptions = {
		origin: "*"
	};

	server.use(cors(corsOptions));

	return server;

};