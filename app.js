const express = require('express'),
      bodyParser = require('body-parser'),
      http = require('http'),
      oracledb = require('oracledb'),
      dbConfig = require('./dbconfig.js'),
      sha256 = require('js-sha256').sha256,
      app = express(),
      server = http.createServer(app),
      port = 3000;

let connection,
    genres,
    databaseConnected = initGenres = false,
    connectedUsers = developerData = [];

oracledb.autoCommit = true;

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
        console.log('Query executed');
        console.log(query.rows);
        if (!insert) {
            if (query.rows.length == 0) {
                resp = false;
            }
        }
    } catch (err) {
        console.error(err);
    }

    console.log('Return value');
    return new Response(resp, query);
};

function checkIp(ip) {
    if (connectedUsers.length > 0) {
        for (var i = 0; i < connectedUsers.length; i++) {
            if (connectedUsers[i]['ip'] === ip) {
                return true;
            }
        }
    }

    return false;
}

let ip = (req) => req.headers['x-forwarded-for'] || req.connection.remoteAddress;

app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/css'));
app.use('/js', express.static(__dirname + 'public/js'));
app.use('/img', express.static(__dirname + 'public/img'));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.set('views', './views');
app.set('view engine', 'ejs');

app.get('/store', (req, res) => {
    if (checkIp(ip(req))) {
        res.render('store', { "title" : "Store", "genres" : genres });
    }
});

app.get('/', async (req, res) => {
    console.log(ip(req));

    if (!initGenres) {
        let genreResp = await executeQuery('select * from genres', {});
        console.log('Genres executed');
        genres = (genreResp.resp) ? genreResp.query.rows : [];
        initGenres = true;
    }

    if (!checkIp(ip(req))) {
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

    if (databaseConnected) {
        try {
            let response = await executeQuery(`select * from users where username=:username`, { "username" : username });

            console.log(`response.resp = ${response.resp}`);
            if (response.resp) {
                const queriedUsername = response.query.rows[0][0];
                const queriedPassword = response.query.rows[0][3];

                if ((username.localeCompare(queriedUsername) == 0) && (sha256(password).localeCompare(queriedPassword) == 0)) {
                    console.log(`Connection accepted for ${ip} user=${username}`)

                    var element = { username : queriedUsername, ip: ip };
                    connectedUsers.pushSet(element, function(e) {
                        return e.username === element.username && e.ip === element.ip;
                    });

                    if (checkIp(ip(req))) {
                        res.redirect('/store');
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
                'ip' : ip(req)
            }, true);

            res.redirect('/');
        }
    }
});

server.listen(port, '192.168.100.23', () => {
    console.log(`Listening on port ${port}`);
    createConnection();
});

process.on('SIGINT', async function() {
    console.log('Exiting app...');
    if (databaseConnected) {
        await connection.close();
        process.exit();
    }
});
