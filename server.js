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

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(express.static('build'));

app.get('/stock', (req, res) => {
    MongoClient.connect(dbUrl, (err, db) => {
        if (err) console.error(err);
        const collection = db.collection('stockdata');
        collection.find({})
        .toArray((err, data) => {
            if (err) console.error(err);

            const stockSymbols = req.body.stockSymbols;
            const stockData = req.body.dataset;
            const dataset = [stockSymbols, stockData];

            console.log('dataset @server "/stock"', dataset);
            if (data.length) {

                collection.updateOne(
                    {},// Update first doc found
                    {$set: {
                        dataset: dataset
                    }}
                );
            } else {
                collection.insert(dataset);
            }
        });
        db.close();
    });
});

app.get('*', (req, res) => {
    res.sendFile(__dirname + '/build/index.html')
});

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('stock symbols', function(symbols) {
        // console.log('symbols recieved @ server:', symbols);
        socket.broadcast.emit('stock symbols', symbols);
    });
    socket.on('stock dataset', function(dataset) {
        // console.log('dataset recieved @ server:', dataset);
        socket.broadcast.emit('stock dataset', dataset);
    });
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
});

http.listen(port, function() {
    console.log('listening on: 8080');
});
