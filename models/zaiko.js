var mongoose = require('mongoose'),Schema = mongoose.Schema;

var zaikoSchema = mongoose.Schema({
    name: String,
    category: String,
    sku: String,
    description: String,
    imgPath: String,
    suryoJan:Number,
    suryoChn:{ type: Number, default: 0 },
    suryoTrans:{ type: Number, default: 0 },
    purchases:[{type: Schema.Types.ObjectId, ref:'Purchase'}],
    delFlg:{ type: Boolean, default: false }
    });

var Zaiko = mongoose.model('Zaiko', zaikoSchema);
module.exports = Zaiko;