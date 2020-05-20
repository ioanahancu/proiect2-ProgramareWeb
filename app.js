const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const bodyParser = require('body-parser');
var cookieParser=require('cookie-parser');
var session=require('express-session');

var start;

var mysql = require('mysql');
var con = mysql.createConnection({
	host:"localhost",
	user:"ioana",
	password:"parola"
	
});

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
		maxAge:1000000
	}
}));
//blocare dupa un nr de incercari esuate
app.use(function (req, res, next) {
	let nextStart=new Date;
	if(req.session.incercariEsuate == undefined || nextStart - start >= 5000 || req.session.incercariEsuate<=3)
	{
		next();
	}
	else if(req.session.incercariEsuate>3)
	{
		res.send("Acces blocat pentru 5 secunde");
	}

});

// la accesarea din browser adresei http://localhost:6789/ se va returna view-ul index.ejs
// proprietățile obiectului Request - req - https://expressjs.com/en/api.html#req
// proprietățile obiectului Response - res - https://expressjs.com/en/api.html#res
app.get('/', (req, res) => {
	if(isNaN(req.session.incercariEsuate))
	{
		req.session.incercariEsuate = 0;
	}
	var lista_produse=[];
	if(con.state == 'disconnected')
	{
		con.connect(function(err){
			if(err) throw err;
			console.log("Connected");
		});
	}
	con.query("USE cumparaturi;");
	con.query("SELECT * FROM produse", function(err, result){
		if(err) throw err;
		// console.log(result);
		for(let i=0; i < result.length; i++)
		{
			lista_produse.push(result[i].id);
			lista_produse.push(result[i].nume_produs);

		}
		// console.log(lista_produse);
		if(req.session && req.session.username){
			if(!req.session.hasOwnProperty('idProduse'))
			{
				req.session.idProduse = [];

			}
			var utilizator = req.session.username;
			var rol=req.session.rol;
			res.render('index', { utilizator: utilizator, rol:rol, lista_produse: lista_produse});
		}
		else{
			req.session.idProduse = [];
			res.render('index', { utilizator: null, lista_produse: lista_produse});
		}	
	});
});

// la accesarea din browser adresei http://localhost:6789/chestionar se va apela funcția specificată
app.get('/chestionar', (req, res) => {
	if(req.session && req.session.username)
	{
		var utilizator = req.session.username;
		fs.readFile('intrebari.json', (err,data) => {
			if(err) throw err;
			let intrebari = JSON.parse(data);
			res.render('chestionar', {intrebari: intrebari, utilizator: utilizator});
		});
	}
	else{
		res.redirect('/autentificare');
	}
	
});

app.post('/rezultat-chestionar', (req, res) => {
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
	var mesajEroare=req.cookies.mesajEroare;
	res.render('autentificare', { mesajEroare: mesajEroare });
	 
});

app.post('/verificare-autentificare', (req, res) => {
		// console.log(req.body);
		res.clearCookie();
		var rol1=req.body['rol'];
		var user1 = req.body['user'];
		var passw1 = req.body['password'];
		fs.readFile('utilizatori.json', (err,data)=> {
			if(err) throw err;
			var users = JSON.parse(data);
			var ok=0;
			users.forEach(user => {
				if(user1 == user.utilizator && passw1 == user.parola && rol1==user.rol){
					req.session.username = user.utilizator;
					req.session.nume=user.nume;
					req.session.prenume=user.prenume;
					req.session.rol=user.rol;
					res.cookie('utlizator', user1);	
					res.cookie('mesajEroare','', {maxAge:0});	
					res.redirect('/');
					ok=1;	
					return;	
				}
			});
			if(ok==0){
				res.cookie('mesajEroare', 'autentificareInvalida');
				res.redirect('/autentificare');
			}
		});	
});

app.get('/delogare', (req, res) => {
	req.session.username=null;
	res.redirect('/');
});

// la accesarea http://localhost:6789/creare-bd, 
//serverul se conectează la serverul de baze de date
// și creează o bază de date cu numele cumparaturi, 
//în care creează o tabelă produse, 
//după care răspunde clientului cu un redirect spre resursa /.
app.get('/creare-bd', (req, res) => {
	if(con.state == 'disconnected')
	{
		con.connect(function(err){
			if(err) throw err;
			console.log("Connected");
		});
	}

	con.query("CREATE DATABASE IF NOT EXISTS cumparaturi", function(err, result){
		if(err) throw err;
		console.log("Database created");
	});
	con.query("USE cumparaturi;");
	var sql = "CREATE TABLE IF NOT EXISTS produse(id int NOT NULL AUTO_INCREMENT, nume_produs varchar(255) NOT NULL, PRIMARY KEY (id));";
	con.query(sql, function(err, result){
		if(err) throw err;
		console.log("Table created");
	});
	res.redirect('/');	
});
	


app.get('/inserare-bd', (req, res)=> {
	if(con.state == 'disconnected')
	{
		con.connect(function(err){
			if(err) throw err;
			console.log("Connected");
		});
	}
	
	con.query("USE cumparaturi");
	var sql = "INSERT INTO produse(nume_produs) VALUES ?";
	var values = [
		['IT, Stephen King'],
		['Harry Potter, J.K. Rowling'],
		['LOTR, J.R.R. Tolkien'],
		['Invata JavaScript, PW']
	];
	con.query(sql, [values], function(err, result){
		if(err) throw err;
		console.log("Number of records inserted: " + result.affectedRows);
	});
	res.redirect('/');
});

app.post('/adaugare-cos', (req, res) => {
	req.session.idProduse.push(req.body['id']);	
	console.log("Produs adăugat în coș");
	res.redirect('/');
});

app.get('/vizualizare-cos', (req, res) => {
	con.query("USE cumparaturi");
	var values = req.session.idProduse;
	var produseAdaugate=[];
	if(values.length != 0)
	{
		var sql="SELECT nume_produs FROM produse WHERE id in ( ? ) ";
		con.query(sql, [values], function(err, result){
			if(err) throw err;
			for(let i=0; i<result.length; i++)
			{
				produseAdaugate.push(result[i].nume_produs);
			}
			res.render('vizualizare-cos', { produse : produseAdaugate});
		});	
	}
	else{
		res.render('vizualizare-cos', {produse: null})
	}
	
});

//Pagina admin
app.get('/admin', (req, res) => {
	if(req.session && req.session.username && req.session.rol == "admin")
	{
		res.render('admin');
	}
	else
	{
		console.log("Nu aveți acces la această pagină");
		res.redirect("/");
	}
});

//Adaugare produs
app.post('/adaugare-produs', (req, res) => {
	var numeProdus = req.body['numeProdus'];
	if(con.state == 'disconnected')
	{
		con.connect(function(err){
			if(err) throw err;
			console.log("Connected");
		});
	}
	con.query("USE cumparaturi");
	var sql = "INSERT INTO produse(nume_produs) VALUES (\" " + numeProdus +"\" )";
	con.query(sql, function(err, result){
		if(err) throw err;
		console.log("Number of records inserted: " + result.affectedRows);
	});
	res.redirect('/admin');
});

var countStart = 0;
app.get('*', function(req, res){
	
	let aici = new Date();

	if(isNaN(req.session.incercariEsuate) || (aici - start >= 5000 && countStart==1 ))
	{
		req.session.incercariEsuate = 0;
	}

	req.session.incercariEsuate += 1;

	if(req.session.incercariEsuate <= 3)
	{
		res.send('404, Pagina nu a fost gasita. Incercari esuate: ' + req.session.incercariEsuate, 404);
		countStart = 0;
	}
	else if(req.session.incercariEsuate>3 && countStart==0)
	{
		countStart = 1;
		start=new Date();
		res.send("Acces blocat pentru 5 secunde");				
	}
  });

app.listen(port, () => console.log(`Serverul rulează la adresa http://localhost:`));