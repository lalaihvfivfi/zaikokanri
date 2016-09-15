var mongoose = require('mongoose'),Schema = mongoose.Schema;

var zaikoSchema = mongoose.Schema({
    name: String,
    category: String,
    sku: String,
    description: String,
    imgPath: String,
    suryoJan:{ type: Number, default: 0 },
    suryoChn:{ type: Number, default: 0 },
    suryoTrans:{ type: Number, default: 0 },
    preSuryoJan:{ type: Number, default: 0 },
    preSuryoChn:{ type: Number, default: 0 },
    preSuryoTrans:{ type: Number, default: 0 },
    syncDate: Date,
    dirty:{ type: Boolean, default: false },
    purchases:[{type: Schema.Types.ObjectId, ref:'Purchase'}],
    sells:[{type: Schema.Types.ObjectId, ref:'Sell'}],
    transports:[{type: Schema.Types.ObjectId, ref:'Transport'}],
    delFlg:{ type: Boolean, default: false }
    });

var Zaiko = mongoose.model('Zaiko', zaikoSchema);
module.exports = Zaiko;