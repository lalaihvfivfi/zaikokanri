var mongoose = require('mongoose'), Schema = mongoose.Schema;

var currencys = 'JPY RMB'.split(' ')

var sellSchema = mongoose.Schema({
  name: String,
  sku:String,
  price: { type: Number, min: 1 },
  quantity:{ type: Number, min: 1 },
  currency: { type: String, enum: currencys },
  sellDate: { type: Date, default: Date.now },
});

sellSchema.virtual('priceWithCurrency').get(function () {
  return this.price + "(" + this.currency + ")";
});

sellSchema.virtual('sellDateYYYYMMDD').get(function () {
  return this.sellDate.getFullYear() + '/' + ('0' + (this.sellDate.getMonth() + 1)).slice(-2) + '/' + ('0' + this.sellDate.getDate()).slice(-2);
});


var Sell = mongoose.model('Sell', sellSchema);
module.exports = Sell;