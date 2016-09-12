var mongoose = require('mongoose'), Schema = mongoose.Schema;

var currencys = 'JPY RMB'.split(' ')

var purchaseSchema = mongoose.Schema({
  name: String,
  sku:String,
  price: { type: Number, min: 1 },
  quantity:{ type: Number, min: 1 },
  currency: { type: String, enum: currencys },
  purchaseDate: { type: Date, default: Date.now },
});

purchaseSchema.virtual('priceWithCurrency').get(function () {
  return this.price + "(" + this.currency + ")";
});

purchaseSchema.virtual('purchaseDateYYYYMMDD').get(function () {
  return this.purchaseDate.getFullYear() + '/' + ('0' + (this.purchaseDate.getMonth() + 1)).slice(-2) + '/' + ('0' + this.purchaseDate.getDate()).slice(-2);
});


var Purchase = mongoose.model('Purchase', purchaseSchema);
module.exports = Purchase;