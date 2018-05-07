let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
const promBundle = require('express-prom-bundle');

// hack to require local module without ../../../..
global.app_require = function(name) {
  return require(__dirname + '/node_modules_project/' + name);
};

let indexRouter = require('./routes/index');
console.log(indexRouter);
let app = express();

// app_data to share state of the server with client (used in process.js route and websocket)
app.app_data = {};
app.app_data.processing_masks_status = {
  available: true,
  message: 'server just started',
};


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// metrics collection setup
const metricsMiddleware = promBundle({includeMethod: true});
app.use(metricsMiddleware);


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());

// routes setup
app.use(express.static(path.join(__dirname, 'public')));
// app.use("/vendors", express.static(path.join(__dirname, "node_modules/vue2-bootstrap-table2/dist")));  // TODO(tofull) Move that into indexRouter

app.use('/', indexRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
