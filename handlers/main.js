var Zaiko = require('../models/zaiko.js');
var Purchase = require('../models/purchase.js');

exports.home = function (req, res) {
    res.render('home');
};

exports.sire = function (req, res, next) {
    res.locals.currtabStocks = "";
    res.locals.currtabPurchase = "active";
    if (req.query.sku) {
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
    } else {
        return res.render('sire');
    }
};

exports.sirepost = function (req, res, next) {
    if (req.body.sku == "" || req.body.name == "" || req.body.category == "" || req.body.quantity == "" || req.body.price == "") {
        req.session.flash = { type: 'danger', intro: 'please input the all field with ※' };
        return res.redirect(303, '/sire?sku=' + req.body.sku);
    }
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
        promise.then(function (zaiko) {
            var purchase = new Purchase({
                _goods: zaiko._id,
                price: req.body.price,
                quantity: req.body.quantity,
                currency: req.session.currency || 'JPY'
            });
            zaiko.purchases.push(purchase);
            zaiko.save();
            purchase.save(function (err) {
                if (err) return next(err);
                if (req.body.continue === 'continue') {
                    return res.redirect(303, '/sire');
                } else {
                    return res.redirect(303, '/sirerireki');
                }
            });
        });
    });
};

exports.zaikos = function (req, res, next) {
    res.locals.currtabStocks = "active";
    res.locals.currtabPurchase = "";
    var categorySd = req.query.category;
    var nameSearch = req.query.nameSearch;
    var sortCol = req.query.sortCol;
    var criteria = { delFlg: false };
    if (categorySd) criteria.category = categorySd;
    if (nameSearch) criteria.name = new RegExp("\.\*" + nameSearch + "\.\*", "i");
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
                        suryoChn: zaiko.suryoChn,
                        suryoTrans: zaiko.suryoTrans
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
    res.locals.currtabStocks = "";
    res.locals.currtabPurchase = "active";
    var nameSearch = req.query.nameSearch;
    var now = new Date();
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate()+1);
    var dateStart = req.query.DateStart ? req.query.DateStart : now.getFullYear() + '/' + ('0' + (now.getMonth() + 1)).slice(-2) + '/01';
    var dateEnd = req.query.DateEnd ? req.query.DateEnd : tomorrow.getFullYear() + '/' + ('0' + (tomorrow.getMonth() + 1)).slice(-2)  + '/' + tomorrow.getDate();
    var criteria = {purchaseDate: { $gte: dateStart, $lte: dateEnd }};
    var populateCon = {
        path: '_goods',
    };
    Purchase.find(criteria).populate(populateCon).sort('-purchaseDate').exec(function (err, purchases) {
        if (err) return next(err);
        var context = {
            purchases: purchases.map(function (purchase) {
                return {
                    goods: purchase._goods.name,
                    purchaseDate: purchase.purchaseDateYYYYMMDD,
                    price: purchase.priceWithCurrency,
                    quantity: purchase.quantity,
                };
            }),
            dateStart: dateStart,
            dateEnd: dateEnd,
            nameSearch: nameSearch
        };
        res.render('sirerireki', context);
    });
};