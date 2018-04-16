'use strict';

var socket_io = require("socket.io"); // Utilities for real time connection

function GEOSOCKET(server) {
    var io = socket_io();

    // Gestion des sockets
    io.sockets.on('connection', function (socket, pseudo) {

        console.log(socket.id + " is now connected ! ");

        // // Envoi à tous les clients qu'un nouveau client vient de se connecter au serveur
        // socket.broadcast.emit('new_client', { socketid: socket.id });

        // // Envoi à tous les clients du nombre de clients connectés
        // io.sockets.emit('count', { nombreClients: io.engine.clientsCount });

        // // Envoi au nouveau client les informations des clients connectés avant sa connexion
        // socket.on('present_to_new_client', function (data) {
        //     console.log(socket.id + " se presente à " + data.socketid);
        //     io.sockets.connected[data.socketid].emit('coordonneesBroadcast', { socketid: socket.id, pos: data.pos, name: data.name });
        // });
        
        // once a client has connected, we expect to get a ping from them saying what room they want to join
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
            // io.sockets.connected[data.socketid].emit('coordonneesBroadcast', { socketid: socket.id, pos: data.pos, name: data.name });
        });

        // // Diffusion d'un changement de position à tous les clients
        // socket.on('coordonneesClient', function (data) {
        //     socket.broadcast.emit('coordonneesBroadcast', { socketid: socket.id, pos: data.pos, name: data.name });
        // });

        // // Diffusion d'un changement de position à tous les clients
        // socket.on('warningRisk', function (data) {
        //     console.log("Risk received.")
        //     socket.broadcast.emit('warningRiskMessage', { message: data.message });
        // });

        // // Lors d'une deconnexion
        // socket.once('disconnect', function () {
        //     // Envoi à tous les clients du nombre de clients connectés
        //     socket.broadcast.emit('count', {
        //         nombreClients: io.engine.clientsCount
        //     });
        //     // Envoi de l'identifiant du client qui vient de se deconnecter pour l'effacer de la carte
        //     socket.broadcast.emit('clientLeft', { socketid: socket.id });
        // });
        socket.on('disconnect', function () {
            console.log(socket.id + 'user disconnected');
        });
    });

    io.attach(server);

    // return function GEOSOCKET(req, res, next) {
    //     res.io = io;
    //     return next();
    // };
}


module.exports = GEOSOCKET;