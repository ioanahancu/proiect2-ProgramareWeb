const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
var cookieParser=require('cookie-parser');
var session=require('express-session');


const fs = require('fs');

const app = express();

const port = 6789;

// directorul 'views' va conține fișierele .ejs (html + js executat la server)
app.set('view engine', 'ejs');
// suport pentru layout-uri - implicit fișierul care reprezintă template-ul site-ului este views/layout.ejs
app.use(expressLayouts);
// directorul 'public' va conține toate resursele accesibile direct de către client (e.g., fișiere css, javascript, imagini)
app.use(express.static('public'))
// corpul mesajului poate fi interpretat ca json; datele de la formular se găsesc în format json în req.body
app.use(bodyParser.json());
// utilizarea unui algoritm de deep parsing care suportă obiecte în obiecte
app.use(bodyParser.urlencoded({ extended: true }));
// utilizare cookies
app.use(cookieParser());
// utilizare sesiuni
app.use(session({
	secret:'secret',
	resave:false,
	saveUninitialized:false,
	cookie:{
		maxAge:10000
	}
}));

// la accesarea din browser adresei http://localhost:6789/ se va returna view-ul index.ejs
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) => {
	console.log(req.cookies);
	res.render('index', { prajituri: req.cookies});
});

// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
	fs.readFile('intrebari.json', (err,data) => {
		if(err) throw err;
		let intrebari = JSON.parse(data);
		res.render('chestionar', {intrebari: intrebari});
	})
});

app.post('/rezultat-chestionar', (req, res) => {
  //console.log(req.body);
  fs.readFile('intrebari.json', (err, data) => {
	if(err) throw err;  
	var data = JSON.parse(data);
	var rCorecte = 0;
	var rIntrebare;
	for( let key in req.body)
	{
		rIntrebare = req.body[key];
		if(rIntrebare == data[key].corect)
		{
			rCorecte ++ ;

		}
	}
	res.render('rezultat-chestionar', {rCorecte: rCorecte});
  })
});

app.get('/autentificare', (req,res) =>{
	 res.render('autentificare', { prajituri: req.cookies });
	 
});

app.post('/verificare-autentificare', (req, res) => {
		// console.log(req.body);
		var user = req.body['user'];
		var passw = req.body['password'];
		if( user == "Ioana" && passw == "buburuza"){
			res.cookie('utlizator', user);		
			res.redirect('/');			
		}
		else{
			res.cookie('mesajEroare', 'autentificareInvalida');
			res.redirect('/autentificare');
		}		
});

// app.use(function(req, res, next) {
// 	res.locals.user = req.session.user;
// 	next();
//   });

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));