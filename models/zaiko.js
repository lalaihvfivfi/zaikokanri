var mongoose = require('mongoose');

var zaikoSchema = mongoose.Schema({
    name: String,
    category: String,
    sku: String,
    description: String,
    tags: [String],
    imgPath: String,
    suryoJan:Number,
    suryoChn:Number,
    delFlg:Boolean
    });

var Zaiko = mongoose.model('Zaiko', zaikoSchema);
module.exports = Zaiko;