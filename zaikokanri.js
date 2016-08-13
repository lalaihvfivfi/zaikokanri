var http = require('http'),
    express = require('express'),
    //	formidable = require('formidable'),
    Zaiko = require('./models/zaiko.js')

var app = express();

var credentials = require('./credentials.js');

// set up handlebars view engine
var handlebars = require('express3-handlebars').create({
    defaultLayout: 'main',
    helpers: {
        section: function (name, options) {
            if (!this._sections) this._sections = {};
            this._sections[name] = options.fn(this);
            return null;
        },
        select: function (selected, options) {
            return options.fn(this).replace(
                new RegExp(' value=\"' + selected + '\"'),
                '$& selected="selected"');
        }
    }
});
app.engine('handlebars', handlebars.engine);
app.set('view engine', 'handlebars');

app.set('port', process.env.PORT || 3000);

// use domains for better error handling
app.use(function (req, res, next) {
    // create a domain for this request
    var domain = require('domain').create();
    // handle errors on this domain
    domain.on('error', function (err) {
        console.error('DOMAIN ERROR CAUGHT\n', err.stack);
        try {
            // failsafe shutdown in 5 seconds
            setTimeout(function () {
                console.error('Failsafe shutdown.');
                process.exit(1);
            }, 5000);

            // disconnect from the cluster
            var worker = require('cluster').worker;
            if (worker) worker.disconnect();

            // stop taking new requests
            server.close();

            try {
                // attempt to use Express error route
                next(err);
            } catch (error) {
                // if Express error route failed, try
                // plain Node response
                console.error('Express error mechanism failed.\n', error.stack);
                res.statusCode = 500;
                res.setHeader('content-type', 'text/plain');
                res.end('Server error.');
            }
        } catch (error) {
            console.error('Unable to send 500 response.\n', error.stack);
        }
    });

    // add the request and response objects to the domain
    domain.add(req);
    domain.add(res);

    // execute the rest of the request chain in the domain
    domain.run(next);
});

// logging
switch (app.get('env')) {
    case 'development':
        // compact, colorful dev logging
        app.use(require('morgan')('dev'));
        break;
    case 'production':
        // module 'express-logger' supports daily log rotation
        app.use(require('express-logger')({ path: __dirname + '/log/requests.log' }));
        break;
}

var MongoSessionStore = require('session-mongoose')(require('connect'));
var sessionStore = new MongoSessionStore({ url: credentials.mongo[app.get('env')].connectionString });

app.use(require('cookie-parser')(credentials.cookieSecret));
app.use(require('express-session')({
    resave: false,
    saveUninitialized: false,
    secret: credentials.cookieSecret,
    //	store: sessionStore,
}));
app.use(express.static(__dirname + '/public'));
app.use(require('body-parser').urlencoded({extended: true}));

// database configuration
var mongoose = require('mongoose');
var options = {
    server: {
        socketOptions: { keepAlive: 1 }
    }
};
switch (app.get('env')) {
    case 'development':
        mongoose.connect(credentials.mongo.development.connectionString, options);
        break;
    case 'production':
        mongoose.connect(credentials.mongo.production.connectionString, options);
        break;
    default:
        throw new Error('Unknown execution environment: ' + app.get('env'));
}

// flash message middleware
app.use(function (req, res, next) {
    // if there's a flash message, transfer
    // it to the context, then clear it
    res.locals.flash = req.session.flash;
    delete req.session.flash;
    next();
});

// middleware to add weather data to context
app.use(function (req, res, next) {
    if (!res.locals.partials) res.locals.partials = {};
    // res.locals.partials.weatherContext = getWeatherData();
    next();
});

// app.get('/vacation/:vacation', function(req, res, next){
// 	Vacation.findOne({ slug: req.params.vacation }, function(err, vacation){
// 		if(err) return next(err);
// 		if(!vacation) return next();
// 		res.render('vacation', { vacation: vacation });
// 	});
// });

app.get('/siire', function (req, res) {
    if (req.query.sku == null) {
        return res.render('siire');
    }
    Zaiko.findOne({ sku: req.query.sku }, function (err, zaiko) {
        if (err) {
            req.session.flash = {
                type: 'danger',
                intro: 'Oops!',
                message: 'Something error! You can try again or contact administrator',
            };
            return res.redirect(303, '/zaikos');
        }
        var context = {
            goods: {
                sku: zaiko.sku,
                name: zaiko.name,
                category: zaiko.category,
                description: zaiko.description,
                imgPath: zaiko.imgPath
            }
        };
        res.render('siire', context);
    });
});

app.post('/siire', function (req, res) {

    Zaiko.findOne({ sku: req.body.sku }, function (err, zaiko) {
        if (err) {
            req.session.flash = {
                type: 'danger',
                intro: 'Oops!',
                message: 'Something error! You can try again or contact administrator',
            };
            return res.redirect(303, '/zaikos');
        }
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
            return res.redirect(303, '/siire');
        } else {
            return res.redirect(303, '/zaikos');
        }
    });
});

app.get('/zaikos', function (req, res) {
    var categorySd = req.query.category;
    var criteria = { delFlg: false };
    if (categorySd) criteria.category = categorySd;
    Zaiko.find({ delFlg: false }).distinct("category").exec(function (err, categorys) {
        Zaiko.find(criteria).sort({ suryoJan: -1, suryoChn: -1, name: 1 }).exec(function (err, zaikos) {
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
});

// app.post('/vacations', function(req, res){
//     Vacation.findOne({ sku: req.body.purchaseSku }, function(err, vacation){
//         if(err || !vacation) {
//             req.session.flash = {
//                 type: 'warning',
//                 intro: 'Ooops!',
//                 message: 'Something went wrong with your reservation; ' +
//                     'please <a href="/contact">contact us</a>.',
//             };
//             return res.redirect(303, '/vacations');
//         }
//         vacation.packagesSold++;
//         vacation.save();
//         req.session.flash = {
//             type: 'success',
//             intro: 'Thank you!',
//             message: 'Your vacation has been booked.',
//         };
//         res.redirect(303, '/vacations');
//     });
// });

// app.get('/cart/add', function(req, res, next){
// 	var cart = req.session.cart || (req.session.cart = { items: [] });
// 	Vacation.findOne({ sku: req.query.sku }, function(err, vacation){
// 		if(err) return next(err);
// 		if(!vacation) return next(new Error('Unknown vacation SKU: ' + req.query.sku));
// 		cart.items.push({
// 			vacation: vacation,
// 			guests: req.body.guests || 1,
// 		});
// 		res.redirect(303, '/cart');
// 	});
// });
// app.post('/cart/add', function(req, res, next){
// 	var cart = req.session.cart || (req.session.cart = { items: [] });
// 	Vacation.findOne({ sku: req.body.sku }, function(err, vacation){
// 		if(err) return next(err);
// 		if(!vacation) return next(new Error('Unknown vacation SKU: ' + req.body.sku));
// 		cart.items.push({
// 			vacation: vacation,
// 			guests: req.body.guests || 1,
// 		});
// 		res.redirect(303, '/cart');
// 	});
// });
// app.get('/cart', function(req, res, next){
// 	var cart = req.session.cart;
// 	if(!cart) next();
// 	res.render('cart', { cart: cart });
// });

// 404 catch-all handler (middleware)
app.use(function (req, res, next) {
    res.status(404);
    res.render('404');
});

// 500 error handler (middleware)
app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.status(500);
    res.render('500');
});

var server;

function startServer() {
    server = http.createServer(app).listen(app.get('port'), function () {
        console.log('Express started in ' + app.get('env') +
            ' mode on http://localhost:' + app.get('port') +
            '; press Ctrl-C to terminate.');
    });
}

if (require.main === module) {
    // application run directly; start app server
    startServer();
} else {
    // application imported as a module via "require": export function to create server
    module.exports = startServer;
}
