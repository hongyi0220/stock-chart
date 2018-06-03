const express = require('express');
const app = express();
const http = require('http').Server(app);
const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;
require('dotenv').config();
const dbUrl = process.env.MONGOLAB_URI;
const port = process.env.PORT || 3000;
const io = require('socket.io')(http);
const bodyParser = require('body-parser');
const webpack = require('webpack');
const webpackConfig = require('./webpack/webpack.dev.js');
const compiler = webpack(webpackConfig);
console.log('server loading');

app.use(require('webpack-dev-middleware')(compiler, {
  publicPath: webpackConfig.output.publicPath
}));
app.use(require('webpack-hot-middleware')(compiler));

app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
app.use(bodyParser.json({ limit: '50mb' }));

app.use(express.static('build'));

app.route('/stock')
  // Retrieve stock data
  .get((req, res) => {
    MongoClient.connect(dbUrl, (err, db) => {
      if (err) {console.error(err);}
      db.collection('stockdata').find({})
      .toArray((err, data) => {
        if (err) console.error(err);
        res.send(data);
        db.close();
      });
    });
  })
  // Store stock data
  .post((req, res) => {
    MongoClient.connect(dbUrl, (err, db) => {
      if (err) {console.error(err);}
      const { packagedStockData } = req.body;
      db.collection('stockdata')
      .insert(packagedStockData)
      .catch(err => console.log(err));
      db.close();
      res.end();
    });
  })
  // Remove a stock datum
  .delete((req, res) => {
    const symbol = req.query.symbol.toUpperCase();

    MongoClient.connect(dbUrl, (err, db) => {
      if (err) {console.error(err);}
      db.collection('stockdata')
      .deleteOne({ stockSymbol: symbol });
      db.close();
      res.end();
    });
  });

app.get('/key', (req, res) => {
  res.send({ key: process.env.Q_API_KEY });
});

app.get('*', (req, res) => {
  res.sendFile(__dirname + '/build/index.html');// eslint-disable-line
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
