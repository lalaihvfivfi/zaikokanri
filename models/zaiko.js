var mongoose = require('mongoose');

var zaikoSchema = mongoose.Schema({
    name: String,
    category: String,
    sku: String,
    description: String,
    imgPath: String,
    suryoJan:Number,
    suryoChn:{ type: Number, default: 0 },
    delFlg:{ type: Boolean, default: false }
    });

var Zaiko = mongoose.model('Zaiko', zaikoSchema);
module.exports = Zaiko;