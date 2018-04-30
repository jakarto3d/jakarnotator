'use strict';

var gulp = require('gulp');
var browserSync = require('browser-sync');
var nodemon = require('gulp-nodemon');

var EXPOSED_PORT = process.env.PORT || 8080
var SYNC_PORT = process.env.SYNCPORT || 8081

gulp.task('default', ['browser-sync'], function () {});

gulp.task('browser-sync', ['nodemon'], function () {
    browserSync.init(null, {
        proxy: `http://localhost:${EXPOSED_PORT}`,
        files: ["public/(?!data)**/*.*", "views/**/*.*", "routes/**/*.*"],
        ignore: ["public/data/**.*"],
        port: SYNC_PORT,
    });
});

gulp.task('nodemon', function (cb) {
    var started = false;
    return nodemon({
        script: './bin/www',
        env: {
            PORT: EXPOSED_PORT
        },
    }).on('start', function () {
        // to avoid nodemon being started multiple times
        // thanks @matthisk
        if (!started) {
            cb();
            started = true;
        }
    });
});