var main = require('./handlers/main.js');

module.exports = function(app){

	// miscellaneous routes
	app.get('/', main.home);
	app.get('/sire', main.sire);
	app.post('/sire', main.sirepost);
	app.get('/zaikos', main.zaikos);

};