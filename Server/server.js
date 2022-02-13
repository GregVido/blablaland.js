var express = require('express');
var app = express();
var https = require('http');
var http = https.Server(app);
var bodyParser = require("body-parser");
var session = require('express-session');
var fs = require('fs');
var database = fs.readFileSync("database.json");
var ServerBBL = require('./blablaland/blablaland.js');
if (database.length > 2) database = JSON.parse(database);
else database = {};

var port = 80;
var servername = "localhost";

var request = require("request");
const config = JSON.parse(fs.readFileSync('config.json'));

request({ uri: "https://raw.githubusercontent.com/GregVido/blablaland.js/master/README.md" },
    function (error, response, body) {
        const local = fs.readFileSync('../README.md', 'utf8');

        if (local.length == body.length) console.log("Votre version est à jour.")
        else console.log("Une mise à jour est disponible.")
    }
);

var origine = new ServerBBL(12301);
var legende = new ServerBBL(12302);
var fury = new ServerBBL(12303);
origine.database = database;
legende.database = database;
fury.database = database;

setInterval(function () {
    database = fs.readFileSync("database.json");
    if (database.length > 2) database = JSON.parse(database);
    else database = {};
    origine.database = database;
}, 200);


// app.use(session({ secret: 'FYJG4J1G1JGH1CG1HFC54GH1',}))
app.use(session({
    secret: "HT4TH41F1H61HF1HF1JHF514JY",
    name: "blablaland.js",
    proxy: true,
    resave: true,
    saveUninitialized: true
}));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/params.xml', (req, res) => {
    res.send(`<params><scriptadr value="/scripts/"/><socket port="12301" host="${servername}"/></params>`);
});
app.post('/scripts//chat/getBBL.php', (req, res) => {
    var user = getUserBySession(req.session.session);
    if (user) {
        res.send(`BBL=${user.bbl}`);
    }
});
app.get('/connexion', (req, res) => {
    if (req.query.validform == 'OK') {
        for (var id in database) {
            if (database[id].pseudo.toUpperCase() == req.query.con_pseudo.toUpperCase()) {
                if (database[id].password.toUpperCase() == req.query.con_password.toUpperCase()) {
                    req.session.username = database[id].pseudo;
                    database[id].session = (Math.floor(Math.random() * 9999999) + 1000000).toString();
                    req.session.session = database[id].session;
                    fs.writeFileSync("database.json", JSON.stringify(database, null, 4), "utf8");
                    return res.send("SUCCESS=" + req.session.session + "=" + database[id].pseudo + "=" + database[id].xp + "=" + database[id].bbl + "=" + database[id].skin.id + "=" + exportColor(database[id].skin.color));
                } else {
                    return res.send("ERR=1");
                }
            }
        }
        return res.send("ERR=0");
    }
});

app.get('/saver', (req, res) => {
    if (req.query.session && req.query.color) {
        for (var id in database) {
            if (database[id].session.toUpperCase() == req.query.session.toUpperCase()) {
                if (config.allowEditSkinColor == "true")
                    database[id].skin.color = readColor(req.query.color);
                if (req.query.skinId && config.allowEditSkinId == "true")
                    database[id].skin.id = parseInt(req.query.skinId);
                fs.writeFileSync("database.json", JSON.stringify(database, null, 4), "utf8");
            }
        }
        return res.send("OK");
    }
});

app.get('/disconnect', (req, res) => {
    if (req.session.username) {
        req.session.username = undefined;
    }
    return res.redirect('/');
});
app.get('/signup', (req, res) => {
    if (req.query.validform == 'Inscription' && req.query.con_pseudo && req.query.con_password) {

        if (req.query.con_pseudo.length < 3)
            return res.send("RES=Ce pseudo est trop court.");
        else if (req.query.con_pseudo.length > 10) {
            return res.send("RES=Ce pseudo est trop long.");
        } else if (req.query.con_password.length < 6) {
            return res.send("RES=Ce mot de passe est trop court.");
        } else if (req.query.con_password.length > 20) {
            return res.send("RES=Ce mot de passe est trop long.");
        } else {
            for (var id in database) {
                if (database[id].pseudo.toUpperCase() == req.query.con_pseudo.toUpperCase()) {
                    return res.send("RES=Ce pseudo est déjà pris par un joueur.");
                }
            }
        }

        req.session.username = req.query.con_pseudo;
        req.session.session = (Math.floor(Math.random() * 9999999) + 1000000).toString();
        req.session.uid = Object.keys(database).length + 1;
        database[req.session.uid] = {
            "id": req.session.uid,
            "pseudo": req.query.con_pseudo,
            "password": req.query.con_password,
            "skin": {
                "color": [0, 0, 88, 44, 44, 58, 0, 0, 0, 0],
                "id": 7,
                "posX": 45000,
                "posY": 420 / 2,
                "direction": true
            },
            "map": {
                "id": 9
            },
            "sexe": 0,
            "bbl": 0,
            "xp": 0,
            "chatColor": "0129402a0a20333334",
            "session": req.session.session,
            "time": new Date().getTime(),
            "role": "Membre"
        };
        fs.writeFileSync("database.json", JSON.stringify(database, null, 4), "utf8");
        return res.send("SUCCESS=1");
    }
    return res.send("RES=Veuillez remplir les champs.");
});
app.get('/', (req, res) => {
    var file = fs.readFileSync("site-web/index.html", 'utf8');
    var form = fs.readFileSync("site-web/form.html", 'utf8');
    if (req.session.username) {
        file = file.replace("{{form}}", `<h1>${req.session.username}</h1><br><a href="/disconnect">Déconnexion</a>`);
        file = file.replace("{{session}}", req.session.session);
    } else {
        file = file.replace("{{form}}", form);
        file = file.replace("{{session}}", `0`);
    }
    if (req.session.message) {
        file = file.replace("<!-- {{message}} -->", `<message>${req.session.message}</message><br>`);
        req.session.message = undefined;
    }
    res.send(file);
});
app.get('/info', (req, res) => {
    var file = fs.readFileSync("site-web/info.html", 'utf8');
    var form = fs.readFileSync("site-web/form.html", 'utf8');
    if (req.session.username) {
        file = file.replace("{{form}}", `<h1>${req.session.username}</h1><br><a href="/disconnect">Déconnexion</a>`);
        file = file.replace("{{session}}", req.session.session);
    } else {
        file = file.replace("{{form}}", form);
        file = file.replace("{{session}}", `0`);
    }
    if (req.session.message) {
        file = file.replace("<!-- {{message}} -->", `<message>${req.session.message}</message><br>`);
        req.session.message = undefined;
    }
    res.send(file);
});
app.use(express.static('site-web'));

http.listen(port, function () {
    console.log("Server Web on " + port);
});

String.prototype.replaceAll = function (search, replacement) {
    var target = this;
    return target.replace(new RegExp(search, 'g'), replacement);
};

function getUserBySession(sess) {
    for (var i in database) {
        if (database[i].session == sess) return database[i];
    }
    return false;
}

function charToHex(number) {
    number++;
    if (number < 0) {
        number = 0xFFFFFFFF + number + 1;
    }

    let res = number.toString(16).toUpperCase();
    if (res.length == 1)
        res = "0" + res;
    return "%" + res;
}

function exportColor(arr) {
    let res = "";
    for (let i in arr)
        res += charToHex(arr[i]);
    return res;
}

function readColor(color) {
    let arr = new Array();

    for (let i = 0; i < color.length; i++)
        arr.push(color.charCodeAt(i) - 1);

    return arr;
}