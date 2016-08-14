var Zaiko = require('../models/zaiko.js');

exports.home = function (req, res) {
	res.render('home');
};

exports.sire = function (req, res, next) {
	if (req.query.sku == null) {
        return res.render('sire');
    }
    Zaiko.findOne({ sku: req.query.sku }, function (err, zaiko) {
        if (err) return next(err);
        var context = {
            goods: {
                sku: zaiko.sku,
                name: zaiko.name,
                category: zaiko.category,
                description: zaiko.description,
                imgPath: zaiko.imgPath
            }
        };
        res.render('sire', context);
    });
};

exports.sirepost = function (req, res ,next) {
	Zaiko.findOne({ sku: req.body.sku }, function (err, zaiko) {
        if (err) return next(err);
        var quantity = parseInt(req.body.quantity);
        if (zaiko) {
            zaiko.suryoJan = zaiko.suryoJan + quantity;
            zaiko.save();
        } else {
            new Zaiko({
                sku: req.body.sku,
                name: req.body.name,
                category: req.body.category,
                imgPath: req.body.imgPath,
                description: req.body.description,
                suryoJan: quantity
            }).save();
        }

        if (req.body.continue === 'continue') {
            return res.redirect(303, '/sire');
        } else {
            return res.redirect(303, '/zaikos');
        }
    });
};

exports.zaikos = function(req,res,next){
	var categorySd = req.query.category;
    var criteria = { delFlg: false };
    if (categorySd) criteria.category = categorySd;
    Zaiko.find({ delFlg: false }).distinct("category").exec(function (err, categorys) {
		if(err) return next(err);
        Zaiko.find(criteria).sort({ suryoJan: -1, suryoChn: -1, name: 1 }).exec(function (err, zaikos) {
			if(err) return next(err);
            var context = {
                zaikos: zaikos.map(function (zaiko) {
                    return {
                        sku: zaiko.sku,
                        name: zaiko.name,
                        description: zaiko.description,
                        suryoJan: zaiko.suryoJan,
                        suryoChn: zaiko.suryoChn
                    };
                }),
                categorys: categorys,
                categorySd: categorySd
            };
            res.render('zaikos', context);
        });
    });
};

exports.setCurrency = function(req,res){
    req.session.currency = req.params.currency;
    res.send({ success: true });
};

