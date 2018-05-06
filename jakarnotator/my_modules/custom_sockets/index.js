'use strict';

var socket_io = require("socket.io"); // Utilities for real time connection

function Sockets(server) {
    var io = socket_io();

    // Gestion des sockets
    io.sockets.on('connection', function (socket, pseudo) {

        console.log(socket.id + " is now connected ! ");

        socket.on('room-join', function (room) {
            socket.join(room);
            console.log(socket.id + " has joined the room  " + room)
        });

        socket.on('room-leave', function (room) {
            socket.leave(room);
            console.log(socket.id + " has left the room  " + room)
        });

        socket.on('send_a_new_json', function (room) {
            console.log("To all connected people in the room " + room + ". You should refresh the json for this image.")
            socket.to(room).broadcast.emit('should_refresh_json');
        });

        socket.on('disconnect', function () {
            console.log(socket.id + 'user disconnected');
        });
    });

    io.attach(server);
}


module.exports = Sockets;