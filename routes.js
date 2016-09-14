var main = require('./handlers/main.js');

module.exports = function (app) {

	// authorization helpers
	function customerOnly(req, res, next) {
		if (req.user && req.user.role === 'customer') return next();
		// we want customer-only pages to know they need to logon
		res.redirect(303, '/Login');
	}

	// miscellaneous routes
	app.get('/', main.home);
	app.get('/sire', customerOnly, main.sire);
	app.post('/sire', main.sirepost);
	app.get('/zaikos', customerOnly, main.zaikos);
	app.post('/setCurrency/:currency', main.setCurrency);
	app.get('/sirerireki', customerOnly, main.sirerireki);
	app.get('/transrireki', customerOnly, main.transrireki);
	app.get('/transport', customerOnly, main.transport);
};