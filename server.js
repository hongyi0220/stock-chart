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

app.get('/getstock', (req, res) => {
    MongoClient.connect(dbUrl, (err, db) => {
        if (err) console.error(err);
        db.collection('stockdata').find({})
        .toArray((err, data) => {
            if (err) console.error(err);
            // console.log('data @ "/getstock":', data);
            res.send(data);
            db.close();
        });
    });
});

app.post('/stock', (req, res) => {
    MongoClient.connect(dbUrl, (err, db) => {
        if (err) console.error(err);
        const packaged = req.body.packaged;
        db.collection('stockdata')
        .insert(packaged);
        db.close();
        res.end();
        //     res.end();
        // collection.find({})
        // .toArray((err, data) => {
        //     if (err) console.error(err);
        //
        //     // const symbol = req.body.stockSymbol;
        //     // const stockSymbols = req.body.stockSymbols;
        //     // const schema = {
        //     //     stockSymbols: [symbol]
        //     // }
        //     const package = req.body.package;
        //     console.log('stockSymbols @ server:', symbol);
        //     if (data.length) {
        //         console.log('data exists, updating..');
        //         collection.updateOne(
        //             {},// Update first doc found
        //             {$push: {stockSymbols: symbol}}
        //         );
        //     } else {
        //         console.log('data doesn\'t exist, inserting..');
        //         collection.insert(schema);
        //     }
        //     db.close();
        //     res.end();
        // });
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
    socket.on('stock data', function(stockData) {
        // console.log('dataset recieved @ server:', dataset);
        socket.broadcast.emit('stock data', stockData);
    });
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
});

http.listen(port, function() {
    console.log('listening on: 8080');
});
