const express = require('express');
const bodyParser = require('body-parser');
const http = require('http');
const oracledb = require('oracledb');
const dbConfig = require('./dbconfig.js');
const sha256 = require('js-sha256').sha256;

const app = express();
const server = http.createServer(app);
const port = 3000;

let connection;
let logged = false;
let databaseConnected = false;
let genres;
let connectedUsers = []
let developerData = [];

Array.prototype.exists = function(comparer) {
    for (var i = 0; i < this.length; i++) {
        if (comparer(this[i])) return true;
    }
    return false;
};

Array.prototype.pushSet = function(element, comparer) {
    if (!this.exists(comparer)) {
        this.push(element);
    }
};

class Response {
    constructor(resp, query) {
        this.resp = resp;
        this.query = query;
    }
};

async function createConnection() {
    try {
        console.log('Initializing the oracle client...');
        oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_19_9'});
        connection = await oracledb.getConnection(dbConfig);
        databaseConnected = true;
        console.log('Oracle connection successful...');
    } catch (err) {
        console.error('Whoops');
        console.error(err);
        process.exit(1);
    }
};

async function executeQuery(sqlStatement, bind, insert=false) {
    let query;
    let resp = false;

    try {
        query = await connection.execute(sqlStatement, bind);
        resp = true;

        if (!insert) {
            if (query.rows.length == 0) {
                resp = false;
            }
        }
    } catch (err) {
        console.error(err);
    }

    return new Response(resp, query);
};

app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/css'));
app.use('/js', express.static(__dirname + 'public/js'));
app.use('/img', express.static(__dirname + 'public/img'));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.set('views', './views');
app.set('view engine', 'ejs');

app.get('/store', (req, res) => {
    res.render('store', { "title" : "Store", "genres" : genres });
});

app.get('/about', (req, res) => {
    res.render('about', { "title" : "About" });
});

app.get('/', (req, res) => {
    console.log(req.headers['x-forwarded-for'] || req.connection.remoteAddress);
    if (!logged) {
        res.render('login', { "title" : "Login | Store", "pageTitle" : "Login" });
    }
});

app.get('/register', (req, res) => {
    res.render('register', { "title" : "Register | Store", "pageTitle" : "Register" });
});

app.get('/dev', (req, res) => {
    res.render('dev', { "title" : "Developer | Store", "pageTitle" : "Developer Dashboard", "data" : developerData });
});

/*
    Post request for the login page
*/
app.post('/auth', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    if (databaseConnected) {
        try {
            let response = await executeQuery(`select * from users where username=:username`, { "username" : username });
            let genreResp = await executeQuery('select * from genres', {});
            
            genres = (genreResp.resp) ? genreResp.query.rows : [];
            console.log(true);
            if (response.resp) {
                const queriedUsername = response.query.rows[0][0];
                const queriedPassword = response.query.rows[0][3];
                console.log(true);
                if ((username.localeCompare(queriedUsername) == 0) && (sha256(password).localeCompare(queriedPassword) == 0)) {
                    var element = { username : queriedUsername, ip: ip };
                    
                    console.log(`Connection accepted for ${ip} user=${username}`)

                    connectedUsers.pushSet(element, function(e) {
                        return e.username === element.username && e.ip === element.ip;
                    });
                    console.log(connectedUsers);

                    for (var i = 0; i < connectedUsers.length; i++) {
                        if (connectedUsers[i]['ip'] === ip) {
                            res.redirect('/store');
                            break;
                        }
                    }
                }
                else {
                    console.log(`Connection rejected for ${ip} user=${username}`)
                    res.redirect('/');
                }
            }
        } catch (err) {
            console.log(err);
        }
    }
});

app.post('/dev', async (req, res) => {
    if (databaseConnected) {
        let response = await executeQuery(`select * from users`, {});
        developerData = response.query.rows;
        res.redirect('/dev');
    }
});

app.post('/register', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const email = req.body.email;
    
    if (databaseConnected) {
        if (password.localeCompare(confirmPassword) == 0) {
            let query = await executeQuery('insert into users values (:username, :email, \'DESKTOP\', :password, :ip)', {
                'username' : username,
                'email' : email,
                'password' : sha256(password),
                'ip' : req.headers['x-forwarded-for'] || req.connection.remoteAddress
            }, true);

            res.redirect('/');
        }
    }
});

server.listen(port, '192.168.100.23', () => {
    console.log(`Listening on port ${port}`);
    createConnection();
});
