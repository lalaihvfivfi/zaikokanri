var mongoose = require('mongoose'), Schema = mongoose.Schema;

var currencys = 'JPY RMB'.split(' ')

var transportSchema = mongoose.Schema({
  name: String,
  sku:String,
  cost: { type: Number, min: 1 },
  quantity:{ type: Number, min: 1 },
  currency: { type: String, enum: currencys },
  transportDate: { type: Date, default: Date.now },
  status : String,
  transCode : String,
  transWay : String
});

transportSchema.virtual('costWithCurrency').get(function () {
  return this.cost + "(" + this.currency + ")";
});

transportSchema.virtual('transportDateYYYYMMDD').get(function () {
  return this.transportDate.getFullYear() + '/' + ('0' + (this.transportDate.getMonth() + 1)).slice(-2) + '/' + ('0' + this.transportDate.getDate()).slice(-2);
});


var Transport = mongoose.model('Transport', transportSchema);
module.exports = Transport;