var Zaiko = require('../models/zaiko.js');
var Purchase = require('../models/purchase.js');
var Q = require('q');

function dateFormat(date){
    return date.getFullYear() + '/' + ('0' + (date.getMonth() + 1)).slice(-2) + '/' + ('0' + date.getDate()).slice(-2);
}
function firstDate(date){
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
        if(purchaseId) zaikozyoho = zaikozyoho.populate({path : 'purchases' ,match : {_id : purchaseId}});
        zaikozyoho.exec(function (err, zaiko) {
            if (err) return next(err);
            var purchaseDate = "";
            if(purchaseId){
                purchaseDate = zaiko.purchases[0].purchaseDateYYYYMMDD;
            }else{
                purchaseDate = dateFormat(new Date());
            }
            var context = {purchaseId: purchaseId};
            if(purchaseId){
                context.goods = {
                    sku: zaiko.sku,
                    name: zaiko.name,
                    category: zaiko.category,
                    description: zaiko.description,
                    imgPath: zaiko.imgPath,
                    date:purchaseDate,
                    price: zaiko.purchases[0].price,
                    quantity: zaiko.purchases[0].quantity
                };
            }else{
                context.goods = {
                    sku: zaiko.sku,
                    name: zaiko.name,
                    category: zaiko.category,
                    description: zaiko.description,
                    imgPath: zaiko.imgPath,
                    date:purchaseDate
                };
            }

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
    var purchaseId = req.body.purchaseId || "";
    var purchaseDate = req.body.date || dateFormat(new Date());
    var quantityOld = 0;
    var promises1 = [];
    var promises2 = [];
    var zaikoId;
    var zaiko;
    var fdeferred = Q.defer();
    promises1.push(fdeferred);
    fdeferred.resolve();
    if(purchaseId){
        var deferred = Q.defer(); 
        Purchase.findOne({_id: purchaseId},function(err,purchase){
            if (err) return next(err);
            if(!purchase || purchase.sku != req.body.sku){
                req.session.flash = { type: 'danger', intro: 'error!' };
                return res.redirect(500, '/500');          
            }
            quantityOld = -purchase.quantity;
            deferred.resolve();
            purchase.purchaseDate = purchaseDate;
            purchase.quantity = req.body.quantity;
            purchase.price = req.body.price;
            purchase.save();
        });
        promises1.push(deferred);
    }
    Q.all(promises1).then(function(){
        var promises2 = [];       
               
        zaiko = Zaiko.findOne({ sku: req.body.sku }, function (err, zaiko) {
            if (err) return next(err);

            var quantity = parseInt(req.body.quantity);
            var deferred = Q.defer();         
            if (zaiko) {
                zaiko.suryoJan = zaiko.suryoJan + quantity + quantityOld;
                zaiko.save(function(err) {
                    if (err) return next(err);
                    deferred.resolve();
                });
                promises2.push(deferred);
            } else {
                new Zaiko({
                    sku: req.body.sku,
                    name: req.body.name,
                    category: req.body.category,
                    imgPath: req.body.imgPath,
                    description: req.body.description,
                    suryoJan: quantity
                }).save(function(err,zaiko) {
                    if (err) return next(err);
                    zaikoId = zaiko._id
                    deferred.resolve();
                });
                promises2.push(deferred);
            }        
            Q.all(promises2).then(function () {
                if(!purchaseId){
                    var purchase = new Purchase({
                        _goods: zaikoId,
                        sku:req.body.sku,
                        price: req.body.price,
                        quantity: req.body.quantity,
                        currency: req.session.currency || 'JPY',
                        purchaseDate: purchaseDate
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
                }else{
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
    var sku = req.query.sku;
    var tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate()+1);
    var dateStart = (req.query.DateStart && !isNaN(new date(req.query.DateStart))) ?  req.query.DateStart: firstDate(new Date()) ;
    var dateEnd = (req.query.DateEnd && !isNaN(new date(req.query.DateEnd))) ? req.query.DateEnd :dateFormat(tomorrow);
    var criteria = {purchaseDate: { $gte: dateStart, $lte: dateEnd }};
    if(sku) criteria.sku = sku;
    var populateCon = {
        path: '_goods',
    };
    Purchase.find(criteria).populate(populateCon).sort('-purchaseDate').exec(function (err, purchases) {
        if (err) return next(err);
        var context = {
            purchases: purchases.map(function (purchase) {
                return {
                    id:purchase._id,
                    sku:purchase.sku,
                    goods: purchase._goods.name,
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