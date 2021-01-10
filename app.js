const UsersConnected = require('./users-connection.js');
const JSAlert = require('js-alert');

const express = require('express'),
      bodyParser = require('body-parser'),
      http = require('http'),
      oracledb = require('oracledb'),
      dbConfig = require('./dbconfig.js'),
      sha256 = require('js-sha256').sha256,
      app = express(),
      server = http.createServer(app),
      DatabaseHeaders = require('./database-header.js'),
      port = 3000;

let connection,
    userConnection = new UsersConnected(),
    genres = games = inputs = [],
    databaseConnected = initGenres = initGames = false,
    connectedUsers = developerData = dataHeader = [],
    selectTable = false,
    devOption = 1;

const tablePlaceholders = {
    1 : ['username', 'email', 'password'],
    2 : ['game_name', 'price', 'genre'],
    4 : ['card_number', 'expiration_date', 'cvv'],
    7 : ['id_device']
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
        try {
            query = await connection.execute(sqlStatement, bind);
            resp = true;

            if (!insert) {
                if (query.rows.length == 0) {
                    resp = false;
                }
            }
        } catch (err) {
            resp = false;
        }
    }

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
        console.log('\x1b[31m', 'Genres queried');
        genres = (genreResp.resp) ? genreResp.query.rows : [];
        initGenres = true;
    }
};
let queryGames = async () => {
    if (databaseConnected) {
        let gamesResp = await executeQuery('select * from games', {});
        console.log('\x1b[31m', 'Games queried');
        games = (gamesResp.resp) ? gamesResp.query.rows : [];
        initGames = true;
    }
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
    if (!checkIp(ip(req))) {
        res.render('login', { "title" : "Login | Store", "pageTitle" : "Login" });
    }
});

app.get('/store', (req, res) => {
    if (checkIp(ip(req))) {
        res.render('store', { "title" : "Store", "pageTitle" : "Store", "store" : true, "genres" : genres });
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

app.get('/profile', async (req, res) => {
    let response = await executeQuery(`select * from users_games where username=:username`, { 
        "username" : userConnection.getUsers()[ip(req)] 
    });
    let profileGames = [];

    if (response.resp === true) {
        profileGames = response.query.rows;
    }

    console.log(`profile ${userConnection.getUsers()[ip(req)]}`);

    res.render('profile', { 
        "title" : "Profile | Store", 
        "pageTitle" : `Profile | ${userConnection.getUsers()[ip(req)]}`, 
        "games" : profileGames,
        "store" : false
    });
});

app.get('/store/:genre', (req, res) => {
    const genr = req.params.genre;
    let capitalized = genr.charAt(0).toUpperCase() + genr.slice(1);

    if (genr === 'mmorpg') {
        capitalized = genr.toUpperCase();
    }

    let filteredGames = games.filter(game => game[2] === capitalized);
    
    res.render('genres', {
        "title" : `${capitalized} | Store`,
        "pageTitle" : capitalized,
        "games" : filteredGames,
        "store" : false
    });
});

app.get('/cart', (req, res) => {
    let cartGames = [];

    if (userConnection.getOrders()[ip(req)] != undefined) {
        cartGames = Array.from(userConnection.getOrders()[ip(req)]);
    }
    
    if (cartGames.length > 0) {
        res.render('cart', { "games" : cartGames });
    }
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
                    console.log('\x1b[32m', `Connection accepted for ${ip(req)} user=${username}`)

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

app.post('/genre', async (req, res) => {
    const price = req.body.price;
    const name = req.body.gameName;

    let response = await executeQuery('select quantity from games where game_name=:game', {
        'game' : name
    });

    const quantity = response.query.rows[0][0];

    if (quantity === 0) {
        JSAlert.alert('The game is out of stock');
    }

    if (quantity > 0) {
        const userGenreName = userConnection.getUsers()[ip(req)];
        console.log(userGenreName);
        let genreNameResponse = await executeQuery('select game_name from users_games where username=:username', {
            'username' : userGenreName
         });

        var checkGame = false;
        for (var i = 0; i < genreNameResponse.query.rows.length; i++) {
            if (genreNameResponse.query.rows[i][0] === name) {
                checkGame = true;
                break;
            }
            console.log(genreNameResponse.query.rows[i][0]);
        }

        if (checkGame === false) {
            let updateQuantity = await executeQuery('update games set quantity=:quantity where game_name=:name', {
                'quantity' : quantity - 1,
                'name' : name
            }, true);
    
            userConnection.executeOrder(ip(req), name);
        }
        else {
            console.log('Game already in library');
        }
        console.log(userConnection.getOrders());
    }
});

app.post('/dev', async (req, res) => {
    const option = req.body.select;
    devOption = req.body.selection;
    let selectStatement;

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
            databaseInfo = DatabaseHeaders.getTable(devOption);
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
                const placeholder0 = req.body.placeholder0;
                const placeholder1 = req.body.placeholder1;
                const placeholder2 = req.body.placeholder2;

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
                const placeholder0 = req.body.placeholder0;
                const placeholder1 = req.body.placeholder1;
                const placeholder2 = req.body.placeholder2;

                let query = await executeQuery(
                    'insert into games values (:game_name, :price, :genre, 5)', 
                    {
                        'game_name' : placeholder0,
                        'price' : placeholder1,
                        'genre' : placeholder2
                    }, 
                    true
                );
            }
            else if (devOption == 7) {
                const placeholder0 = req.body.placeholder0;
                
                let query = await executeQuery(
                    'insert into registered_devices values (:id)', 
                    {
                        'id' : placeholder0
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

            query = await executeQuery(
                'insert into registered_devices values (:id_device)',
                {
                    'id_device' : ip(req)
                },
                true
            );

            query = await executeQuery(
                'insert into users_devices values (:id_device, :username)',
                {
                    'id_device' : ip(req),
                    'username' : username
                },
                true
            );

            res.redirect('/');
        }
    }
});

app.post('/order', async (req, res) => {
    const card_number = req.body.card_number;
    const cvv = req.body.cvv;
    const date = req.body.date;

    console.log(card_number);
    console.log(cvv);
    console.log(date);

    if (databaseConnected) {
        try {
            userConnection.getOrders()[ip(req)].forEach(async (game) => {
                let queryOrder = await executeQuery(
                    `insert into orders values (null, :card, to_date(\'${date.split('-').join('.')}\', \'YYYY.MM.DD\'), ` +
                    `:cvv, :device, ` + 
                    `:username, ` +
                    `:game)`,
                    { 
                        'card' : card_number,
                        'device' : ip(req),
                        'cvv' : cvv,
                        'username' : userConnection.getUsers()[ip(req)],
                        'game' : game
                    }, true
                );

                if (queryOrder.resp === true) {
                    let query = await executeQuery(
                        'insert into users_games values (null, :username, :game)',
                        {
                            'username' : userConnection.getUsers()[ip(req)],
                            'game' : game
                        },
                        true
                    );
                    userConnection.eliminateOrder(ip(req), game);
                }
                else {
                    console.log('Order failed');
                }
            });
        }
        catch (err) {
            console.log('\x1b[37m', 'Constraint violated');
        }

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
