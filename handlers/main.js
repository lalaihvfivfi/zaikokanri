var Zaiko = require('../models/zaiko.js');
var Purchase = require('../models/purchase.js');

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

exports.sirepost = function (req, res, next) {
    Zaiko.findOne({ sku: req.body.sku }, function (err, zaiko) {
        if (err) return next(err);
                
        var quantity = parseInt(req.body.quantity);
        if (zaiko) {
            zaiko.suryoJan = zaiko.suryoJan + quantity;
            var promise = zaiko.save();
        } else {
            var promise = new Zaiko({
                sku: req.body.sku,
                name: req.body.name,
                category: req.body.category,
                imgPath: req.body.imgPath,
                description: req.body.description,
                suryoJan: quantity
            }).save();
        }
        promise.then(function(zaiko){
            new Purchase({
                _goods: zaiko._id,
                price: req.body.price,
                currency: req.session.currency || 'JPY'
            }).save(function(err){
                if (err) return next(err);
                if (req.body.continue === 'continue') {
                    return res.redirect(303, '/sire');
                } else {
                    return res.redirect(303, '/zaikos');
                }                  
            });
        });
    });
};  

exports.zaikos = function (req, res, next) {
    var categorySd = req.query.category;
    var nameSearch = req.query.nameSearch;
    var sortCol = req.query.sortCol;    
    var criteria = { delFlg: false };
    if (categorySd) criteria.category = categorySd;  
    if (nameSearch) criteria.name = new RegExp("\.\*" + nameSearch + "\.\*","i") ;
    Zaiko.find({ delFlg: false }).distinct("category").exec(function (err, categorys) {
        if (err) return next(err);
        Zaiko.find(criteria).sort(sortCol).exec(function (err, zaikos) {
            if (err) return next(err);
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
                categorySd: categorySd,
                nameSearch: nameSearch
            };
            res.render('zaikos', context);
        });
    });
};

exports.setCurrency = function (req, res) {
    req.session.currency = req.params.currency;
    res.send({ success: true });
};

exports.sirerireki = function (req, res, next) {
        var dateStart = req.query.DateStart;
        var nameSearch = req.query.nameSearch;
        var dateEnd = req.query.DateEnd;
        var criteria = {};
        if (nameSearch) criteria.name = new RegExp("\.\*" + nameSearch + "\.\*", "i"); 
        if (dateStart) criteria.purchaseDate = { $gt : dateStart};
        if (dateEnd) criteria.purchaseDate = { $lt : dateEnd};
        Purchase.find(criteria).populate("_goods").exec(function (err, purchases){
            if (err) return next(err);
            var context = {
                purchases: purchases.map(function (purchase) {
                    return {
                        goods: purchase._goods.name,
                        purchaseDate: purchase.purchaseDateYYYYMMDD,
                        price: purchase.priceWithCurrency,
                    };
                }),
            };
            res.render('sirerireki', context);
         });
};