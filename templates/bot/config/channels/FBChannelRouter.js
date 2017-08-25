var express = require("express");

var FBController = require("./../../app/controllers/FB");
var FBChannelRouter = express.Router();

FBChannelRouter.post("/webhook", FBController.webhook_post);
FBChannelRouter.get("/webhook", FBController.webhook_get);

module.exports = FBChannelRouter;