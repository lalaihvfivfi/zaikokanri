var Zaiko = require('../models/zaiko.js');
var Purchase = require('../models/purchase.js');
var Sell = require('../models/sell.js');
var Transport = require('../models/transport.js');
var Q = require('q');

function dateFormat(date) {
    return date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2);
}
function firstDate(date) {
    return date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/01';
}

exports.home = function (req, res) {
    res.render('home');
};

exports.sire = function (req, res, next) {
    res.locals.currtabStocks = "";
    res.locals.currtabPurchase = "active";
    var purchaseId = req.query.purchaseId || "";
    if (req.query.sku) {
        var zaikozyoho = Zaiko.findOne({ sku: req.query.sku });
        if (purchaseId) zaikozyoho = zaikozyoho.populate({ path: 'purchases', match: { _id: purchaseId } });
        zaikozyoho.exec(function (err, zaiko) {
            if (err) return next(err);
            var purchaseDate = "";
            if (purchaseId) {
                purchaseDate = zaiko.purchases[0].purchaseDateYYYYMMDD;
            } else {
                purchaseDate = dateFormat(new Date());
            }
            var context = { purchaseId: purchaseId };
            if (purchaseId) {
                context.goods = {
                    sku: zaiko.sku,
                    name: zaiko.name,
                    category: zaiko.category,
                    description: zaiko.description,
                    imgPath: zaiko.imgPath,
                    date: purchaseDate,
                    price: zaiko.purchases[0].price,
                    quantity: zaiko.purchases[0].quantity
                };
            } else {
                context.goods = {
                    sku: zaiko.sku,
                    name: zaiko.name,
                    category: zaiko.category,
                    description: zaiko.description,
                    imgPath: zaiko.imgPath,
                    date: purchaseDate
                };
            }

            res.render('sire', context);
        });
    } else {
        return res.render('sire');
    }
};

exports.sirepost = function (req, res, next) {
    if ((req.body.continue !== 'del') && 
        (req.body.sku == "" || req.body.name == "" || req.body.category == "" || req.body.quantity == "" || req.body.price == "")) {
        req.session.flash = { type: 'danger', intro: 'please input the all field with ※' };
        return res.redirect(303, '/sire?sku=' + req.body.sku);
    }
    var purchaseId = req.body.purchaseId || "";
    var purchaseDate = req.body.date || dateFormat(new Date());
    var promises = [];
    if (purchaseId) {
        var deferred = Q.defer();
        Purchase.findOne({ _id: purchaseId }, function (err, purchase) {
            if (err) return next(err);
            if (!purchase || purchase.sku != req.body.sku) {
                req.session.flash = { type: 'danger', intro: 'error!' };
                return res.redirect(500, '/500');
            }
            if(req.body.continue === 'delete'){
                Purchase.remove({ _id: purchaseId }, function (err, purchase){
                    deferred.resolve();
                });
                Zaiko.findOne({sku: req.body.sku},function (err, zaiko){
                    zaiko.purchases.splice(zaiko.purchases.lastIndexOf(purchaseId),1);
                    zaiko.save();
                });
            } else {
                purchase.purchaseDate = purchaseDate;
                purchase.quantity = req.body.quantity;
                purchase.price = req.body.price;
                purchase.save(function (err, purchase) {
                    deferred.resolve();
                });
            }
        });
        promises.push(deferred);
    } else {
        var deferred = Q.defer();
        var purchase = new Purchase({
            name: req.body.name,
            sku: req.body.sku,
            price: req.body.price,
            quantity: req.body.quantity,
            currency: req.session.currency || 'JPY',
            purchaseDate: purchaseDate
        });

        purchase.save(function (err, purchase) {
            deferred.resolve();
        });
        promises.push(deferred);

        zaiko = Zaiko.findOne({ sku: req.body.sku }, function (err, zaiko) {
            if (err) return next(err);

            if (zaiko) {
                zaiko.purchases.push(purchase);
                zaiko.save();
            } else {
                new Zaiko({
                    sku: req.body.sku,
                    name: req.body.name,
                    category: req.body.category,
                    imgPath: req.body.imgPath,
                    description: req.body.description,
                    currentDate: dateFormat(new Date()),
                    purchases: [purchase._id]
                }).save();
            }
        });
    }
    Q.all(promises).then(function () {
        if (req.body.continue === 'continue') {
            return res.redirect(303, '/sire');
        } else {
            return res.redirect(303, '/sirerireki');
        }
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
    var context = {categorySd: categorySd, nameSearch: nameSearch};
    var promises = [];
    var deferred1 = Q.defer();
    Zaiko.find({ delFlg: false }).distinct("category").exec(function (err, categorys) {
        if (err) return next(err);
        context.categorys = categorys;
        deferred1.resolve();
    });
    promises.push(deferred1.promise);
    var deferred2 = Q.defer();
    Zaiko.find(criteria).populate('purchases transports sells','quantity').sort(sortCol).exec(function (err, zaikos) {
        if (err) return next(err);

        context.zaikos = zaikos.map(function (zaiko) {                    
            var suryoJan = zaiko.preSuryoJan;
            var suryoChn = zaiko.preSuryoChn;
            var suryoTrans = zaiko.preSuryoTrans;
            var suryoTransD = 0;
            for(transport of zaiko.transports) {
                if (transport.status == "done") {
                    suryoTransD = suryoTransD + transport.quantity;
                } else {
                    suryoTrans = suryoTrans + transport.quantity;
                }
            }
            for(purchase of zaiko.purchases) {
                suryoJan = suryoJan + purchase.quantity;
            }
            for(sell of zaiko.sells) {
                suryoChn = suryoChn - sell.quantity;
            }

            return {
                sku: zaiko.sku,
                name: zaiko.name,
                description: zaiko.description,
                suryoJan: suryoJan - suryoTrans - suryoTransD,
                suryoChn: suryoChn + suryoTransD,
                suryoTrans: suryoTrans
            };
        })
        deferred2.resolve();
    });
    promises.push(deferred2.promise);
    Q.all(promises).then(function () {
        res.render('zaikos', context);
    });
};

exports.setCurrency = function (req, res) {
    req.session.currency = req.params.currency;
    res.send({ success: true });
};

exports.sirerireki = function (req, res, next) {
    res.locals.currtabStocks = "";
    res.locals.currtabPurchase = "active";
    var sku = req.query.sku;
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    var dateStart = (req.query.DateStart && !isNaN(new date(req.query.DateStart))) ? req.query.DateStart : firstDate(new Date());
    var dateEnd = (req.query.DateEnd && !isNaN(new date(req.query.DateEnd))) ? req.query.DateEnd : dateFormat(tomorrow);
    var criteria = { purchaseDate: { $gte: dateStart, $lte: dateEnd } };
    if (sku) criteria.sku = sku;

    Purchase.find(criteria).sort('-purchaseDate').exec(function (err, purchases) {
        if (err) return next(err);
        var context = {
            purchases: purchases.map(function (purchase) {
                return {
                    id: purchase._id,
                    sku: purchase.sku,
                    goods: purchase.name,
                    purchaseDate: purchase.purchaseDateYYYYMMDD,
                    price: purchase.priceWithCurrency,
                    quantity: purchase.quantity,
                };
            }),
            dateStart: dateStart,
            dateEnd: dateEnd,
        };
        res.render('sirerireki', context);
    });
};