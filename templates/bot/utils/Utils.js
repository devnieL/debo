var CryptoJS = require("crypto-js");

module.exports = {

  handleError : function(req, res, error, status){

    var status = status || error.status || 500;

    if(error != undefined && !error.message){
      error.message = error.toString() + ' | ' + error.code;
      return res.status(status).send(error);
    }else{
      return res.status(500).send(error);
    }

  },

  encrypt : function (data) {
    return (CryptoJS.AES.encrypt(JSON.stringify(data), process.env.CRYPTO_SECRET)).toString();
  },

  decrypt : function (data) {
    
    if(data == null)
      return data;

    var bytes  = CryptoJS.AES.decrypt(data, process.env.CRYPTO_SECRET);
    var decryptedData = JSON.parse(bytes.toString(CryptoJS.enc.Utf8));
    return decryptedData;
  },

  getRandomIntInclusive : function(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }


}
