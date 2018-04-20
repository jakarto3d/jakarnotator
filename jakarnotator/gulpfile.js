'use strict';

var gulp = require('gulp');
var browserSync = require('browser-sync');
var nodemon = require('gulp-nodemon');

gulp.task('default', ['browser-sync'], function () {

});

gulp.task('browser-sync', ['nodemon'], function () {
    browserSync.init(null, {
        proxy: "http://localhost:8080",  // TODO(tofull) find a way to use port as variable
        files: ["public/**/*.*", "views/**/*.*", "routes/**/*.*"],
        ignore: ["public/data/**.*"],
        port: 8081,  // TODO(tofull) find a way to use port as variable
    });
});
gulp.task('nodemon', function (cb) {
    var started = false;
    return nodemon({
        script: './bin/www',
        env: {
            PORT: 8080  // TODO(tofull) find a way to use port as variable
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