var express = require("express");

var WebController = require("./../../app//controllers/Web");
var WebChannelRouter = express.Router();

WebChannelRouter.post("/query", WebController.query);
WebChannelRouter.get("/version", WebController.version);

module.exports = WebChannelRouter;