'use strict';

let gulp = require('gulp');
let browserSync = require('browser-sync');
let nodemon = require('gulp-nodemon');

let EXPOSED_PORT = process.env.PORT || 8080;
let SYNC_PORT = process.env.SYNCPORT || 8081;

gulp.task('default', ['browser-sync'], function() {});

gulp.task('browser-sync', ['nodemon'], function() {
    browserSync.init(null, {
        proxy: `http://localhost:${EXPOSED_PORT}`,
        files: ['public/(?!data)**/*.*', 'views/**/*.*', 'routes/**/*.*'],
        ignore: ['public/data/**.*'],
        port: SYNC_PORT,
    });
});

gulp.task('nodemon', function(cb) {
    let started = false;
    return nodemon({
        script: './bin/www',
        env: {
            PORT: EXPOSED_PORT,
        },
    }).on('start', function() {
        // to avoid nodemon being started multiple times
        // thanks @matthisk
        if (!started) {
            cb();
            started = true;
        }
    });
});
