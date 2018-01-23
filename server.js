const express = require('express');
const app = express();
const http = require('http').Server(app);
const port = process.env.PORT || 8080;
const io = require('socket.io')(http);

app.use(express.static('build'));

app.get('*', (req, res) => {
    res.sendFile(__dirname + '/build/index.html')
});

io.on('connection', function(socket) {
    console.log('a user connected');
    socket.on('stock symbols', function(symbols) {
        console.log('symbols recieved @ server:', symbols);
        socket.broadcast.emit('stock symbols', symbols);
    });
    socket.on('stock dataset', function(dataset) {
        console.log('dataset recieved @ server:', dataset);
        socket.broadcast.emit('stock dataset', dataset);
    });
    socket.on('disconnect', function() {
        console.log('user disconnected');
    });
});

http.listen(port, function() {
    console.log('listening on: 8080');
});
