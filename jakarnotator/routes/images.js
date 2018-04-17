var express = require("express");
var router = express.Router();
var bodyParser = require('body-parser');

router.use(bodyParser.json());  // parse application/json
router.use(bodyParser.urlencoded({ extended: true }));  // parse application/x-www-form-urlencoded

var fs = require("fs");

/* GET users listing. */
router.get("/", function (req, res, next) {
  var imageFolder = 'public/data/images'
  fs.readdir(imageFolder, (err, files) => {
    res.json(JSON.stringify(files));
  })
});

module.exports = router;
