const { uptime } = require('process');
const UsersConnected = require('./users-connection.js');

const express = require('express'),
      bodyParser = require('body-parser'),
      http = require('http'),
      oracledb = require('oracledb'),
      dbConfig = require('./dbconfig.js'),
      sha256 = require('js-sha256').sha256,
      app = express(),
      server = http.createServer(app)
      DatabaseHeaders = require('./database-header.js'),
      port = 3000;

let connection,
    user_connection = require('./users-connection.js'),
    userConnection = new user_connection(),
    genres = games = inputs = [],
    databaseConnected = initGenres = initGames = false,
    connectedUsers = developerData = dataHeader = [],
    selectTable = false,
    devOption = 1;

const tablePlaceholders = {
    1 : ['username', 'email', 'password'],
    2 : ['game_name', 'price', 'genre'],
    4 : ['card_number', 'expiration_date', 'cvv']
};

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

class RequestLogin {
    static approveRequest(req) {
        const ipReq = ip(req);
        for (var i = 0; i < connectedUsers.length; i++) {
            if (connectedUsers[i]['ip'] == ipReq) {
                return true;
            }
        }
        return false;
    }
};

async function createConnection() {
    try {
        console.log('Initializing the oracle client...');
        oracledb.initOracleClient({ libDir: 'C:\\oracle\\instantclient_19_9'});
        connection = await oracledb.getConnection(dbConfig);
        databaseConnected = true;
        console.log('Oracle connection successful...');
        queryGenres();
        queryGames();
    } catch (err) {
        console.error('Whoops');
        console.error(err);
        process.exit(1);
    }
};

async function executeQuery(sqlStatement, bind, insert=false) {
    let query;
    let resp = false;

    if (databaseConnected) {
        query = await connection.execute(sqlStatement, bind);
        resp = true;

        if (!insert) {
            if (query.rows.length == 0) {
                resp = false;
            }
        }
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
let queryGenres = async () => {
    if (databaseConnected) {
        let genreResp = await executeQuery('select * from genres', {});
        console.log('Genres queried');
        genres = (genreResp.resp) ? genreResp.query.rows : [];
        initGenres = true;
    }
};
let queryGames = async () => {
    if (databaseConnected) {
        let gamesResp = await executeQuery('select * from games', {});
        console.log('Games queried');
        games = (gamesResp.resp) ? gamesResp.query.rows : [];
        console.log(games);
        initGames = true;
    }
};

let getUserByIp = (req) => {
    if (connectedUsers.length > 0) {
        for (var i = 0; i < connectedUsers.length; i++) {
            if (connectedUsers[i]['ip'] === ip(req)) {
                return connectedUsers[i]['username'];
            }
        }
    }
    return undefined;
};

app.use(express.static('public'));
app.use('/css', express.static(__dirname + 'public/css'));
app.use('/js', express.static(__dirname + 'public/js'));
app.use('/img', express.static(__dirname + 'public/img'));
app.use('/fontawesome', express.static(__dirname + 'fontawesome'));
app.use(bodyParser.urlencoded({extended : true}));
app.use(bodyParser.json());

app.set('views', './views');
app.set('view engine', 'ejs');

app.get('/', async (req, res) => {
    console.log(ip(req));

    if (!checkIp(ip(req))) {
        res.render('login', { "title" : "Login | Store", "pageTitle" : "Login" });
    }
});

app.get('/store', (req, res) => {
    if (checkIp(ip(req))) {
        res.render('store', { "title" : "Store", "pageTitle" : "Store", "genres" : genres });
    }
});

app.get('/register', (req, res) => {
    res.render('register', { "title" : "Register | Store", "pageTitle" : "Register" });
});

app.get('/dev', (req, res) => {
    res.render('dev', { 
        "title" : "Developer | Store", 
        "pageTitle" : "Developer Dashboard", 
        "data" : developerData, 
        "dataHeader": dataHeader,
        "select" : selectTable,
        "option" : devOption,
        "inputs" : inputs  
    });
});

app.get('/profile', (req, res) => {
    res.render('profile', { 
        "title" : "Profile | Store", 
        "pageTitle" : `Profile | ${userConnection.getUsers()[ip(req)]}`, 
        "games" : async () => {
            let response = await executeQuery(`select * from users_games where username=:username`, { 
                "username" : userConnection.getUsers()[ip(req)] 
            });

            console.log(response.query[0]);
        } });
});

app.get('/order', (req, res) => {
    res.render('order', { "title" : "Order | Store", "pageTitle" : "Order", "games" : ['d', 's', 'a'] })
});

app.get('/action', (req, res) => {
    let filteredGames = games.filter(game => game[2] === 'Action');
    res.render('partials/genres', { "title" : "Action | Store", "pageTitle" : "Action", "games" : filteredGames });
});

app.get('/adventure', (req, res) => {
    let filteredGames = games.filter(game => game[2] === 'Adventure');
    res.render('partials/genres', { "title" : "Adventure | Store", "pageTitle" : "Adventure", "games" : filteredGames });
});

app.get('/horror', (req, res) => {
    let filteredGames = games.filter(game => game[2] === 'Horror');
    res.render('partials/genres', { "title" : "Action | Store", "pageTitle" : "Horror", "games" : filteredGames });
});

app.get('/indie', (req, res) => {
    let filteredGames = games.filter(game => game[2] === 'Indie');
    res.render('partials/genres', { "title" : "Action | Store", "pageTitle" : "Indie", "games" : filteredGames });
});

app.get('/mmorpg', (req, res) => {
    let filteredGames = games.filter(game => game[2] === 'MMORPG');
    res.render('partials/genres', { "title" : "Action | Store", "pageTitle" : "MMORPG", "games" : filteredGames });
});

app.get('/multiplayer', (req, res) => {
    let filteredGames = games.filter(game => game[2] === 'Multiplayer');
    res.render('partials/genres', { "title" : "Action | Store", "pageTitle" : "Multiplayer", "games" : filteredGames });
});

app.get('/cart', (req, res) => {
    console.log(userConnection.getOrders()[ip(req)].values());
    res.render('cart', { "games" : Array.from(userConnection.getOrders()[ip(req)]) })
});

/*
    Post request for the login page
*/
app.post('/login', async (req, res) => {
    var username = req.body.username;
    var password = req.body.password;

    if (databaseConnected) {
        try {
            let response = await executeQuery(`select * from users where username=:username`, { "username" : username });

            console.log(`response.resp = ${response.resp}`);
            if (response.resp) {
                const queriedUsername = response.query.rows[0][0];
                const queriedPassword = response.query.rows[0][3];

                if ((username === queriedUsername) && (sha256(password) === queriedPassword)) {
                    console.log(`Connection accepted for ${ip(req)} user=${username}`)

                    var element = { username : queriedUsername, ip: ip(req) };
                    connectedUsers.pushSet(element, function(e) {
                        return e.username === element.username && e.ip === element.ip;
                    });

                    if (checkIp(ip(req))) {
                        console.log('Redirected');
                        userConnection.addUser(ip(req), queriedUsername);
                        res.redirect('/store');
                    }
                }
                else {
                    console.log(`Connection rejected for ${ip(req)} user=${username}`)
                    res.redirect('/');
                }
            }
        } catch (err) {
            console.log(err);
        }
    }
});

app.post('/genre', (req, res) => {
    const price = req.body.price;
    const name = req.body.gameName;
    // console.log(price);
    // console.log(name);

    userConnection.executeOrder(ip(req), name);
    console.log(userConnection.getOrders());
});

app.post('/dev', async (req, res) => {
    const option = req.body.select;
    const selectOption = req.body.selection;
    let selectStatement;
    devOption = selectOption;

    if (Object.keys(tablePlaceholders).includes(devOption)) {
        inputs = tablePlaceholders[devOption];
    }
    else {
        inputs = [];
    }

    selectTable = false;
    if (databaseConnected) {
        let response;

        if (option === 'SELECT') {
            databaseInfo = DatabaseHeaders.getTable(selectOption);
            dataHeader = databaseInfo[1];
            selectStatement = `select * from ${databaseInfo[0]}`
            selectTable = true;
            response = await executeQuery(selectStatement, {});
            developerData = response.query.rows;
        }
        else if (option === 'DELETE') {
            developerData = [];
            dataHeader = [];
            console.log('DELETE');
        }
        else if (option === 'INSERT') {
            if (devOption == 1) {
                
                let query = await executeQuery(
                    'insert into users values (:username, :email, \'DESKTOP\', :password, :ip)', 
                    {
                        'username' : placeholder0,
                        'email' : placeholder1,
                        'password' : sha256(placeholder2),
                        'ip' : ip(req)
                    }, 
                    true
                );
            }
            else if (devOption == 2) {
                let query = await executeQuery(
                    'insert into games values (:game_name, :price, :genre)', 
                    {
                        'game_name' : placeholder0,
                        'price' : placeholder1,
                        'genre' : placeholder2
                    }, 
                    true
                );
            }
        }
        res.redirect('/dev');
    }
});

app.post('/register', async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const email = req.body.email;
    
    if (databaseConnected) {
        if (password === confirmPassword) {
            let query = await executeQuery(
                'insert into users values (:username, :email, \'DESKTOP\', :password, :ip)', 
                {
                    'username' : username,
                    'email' : email,
                    'password' : sha256(password),
                    'ip' : ip(req)
                }, 
                true
            );

            res.redirect('/');
        }
    }
});

app.post('/order', async (req, res) => {
    if (databaseConnected) {
        userConnection.getOrders()[ip(req)].forEach(async (game) => {
            let query = await executeQuery(
                'insert into users_games values (null, :username, :game)',
                {
                    'username' : userConnection.getUsers()[ip(req)],
                    'game' : game
                },
                true
            );

            userConnection.eliminateOrder(ip(req), game);
        });

        res.redirect('store');
    }
});

server.listen(port, '192.168.100.23', () => {
    console.log(`Listening on port ${port}`);
    createConnection();
});

process.on('SIGINT', async function() {
    console.log('Exiting app...');
    if (databaseConnected) {
        try {
            await connection.close();
            process.exit();
        }
        catch (err) {
            console.log(err);
        }
    }
});
