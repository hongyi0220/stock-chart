const express = require('express');
const app = express();
const http = require('http').Server(app);
const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;
require('dotenv').config();
const dbUrl = process.env.MONGOLAB_URI;
const port = process.env.PORT || 8080;
const io = require('socket.io')(http);
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

app.use(express.static('build'));
// Remove a stock data from DB
app.get('/remove', (req, res) => {
    const query = req.query;
    const symbol = query.symbol.toUpperCase();

    MongoClient.connect(dbUrl, (err, db) => {
        if (err) console.error(err);
        db.collection('stockdata')
        .deleteOne({stockSymbol: symbol});
        db.close();
        res.end();
    });
});
// Retrieve stock data from DB
app.get('/getstock', (req, res) => {
    MongoClient.connect(dbUrl, (err, db) => {
        if (err) console.error(err);
        db.collection('stockdata').find({})
        .toArray((err, data) => {
            if (err) console.error(err);
            res.send(data);
            db.close();
        });
    });
});
// Store stock data
app.post('/stock', (req, res) => {
    MongoClient.connect(dbUrl, (err, db) => {
        if (err) console.error(err);
        const packaged = req.body.packaged;
        db.collection('stockdata')
        .insert(packaged);
        db.close();
        res.end();
    });
});

app.get('*', (req, res) => {
    res.sendFile(__dirname + '/build/index.html')
});
// Listen for change on the front-end, then emit to all users connected
io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('stock symbols', function(symbols) {
        socket.broadcast.emit('stock symbols', symbols);
    });
    socket.on('stock names', function(names) {
        socket.broadcast.emit('stock names', names);
    });
    socket.on('stock data', function(stockData) {
        socket.broadcast.emit('stock data', stockData);
    });
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
});

http.listen(port);
