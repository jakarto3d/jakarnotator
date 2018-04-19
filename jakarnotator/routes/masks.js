var express = require("express");
var router = express.Router();
var bodyParser = require('body-parser');
var fs = require("fs");

router.use(bodyParser.json());  // parse application/json
router.use(bodyParser.urlencoded({ extended: true }));  // parse application/x-www-form-urlencoded


/* GET users listing. */
router.get("/", function(req, res, next) {
  res.send("respond with a resource");
});

router.get("/:image_name", (req, res) => {
  var image_name = req.params.image_name;
  var mask = `public/data/masks/${image_name}.json`;

  fs.readFile(mask, "utf8", function (err, data) {
    if (err) {
      var empty_data = "{}";
      // TODO(tofull) write file only if data/images/${image_name} exists
      fs.writeFile(mask, empty_data, function (err) {
        if (err) throw err;
        res.send(empty_data);
      });
    } else {
      res.send(data);
    }
  });
});

router.post("/:image_name", (req, res) => {
  var image_name = req.params.image_name;
  var mask = `public/data/masks/${image_name}.json`;

  var updated_data = JSON.stringify(req.body);

  fs.writeFile(mask, updated_data, function (err) {
    if (err) throw err;
    res.json({ message: `${image_name} updated` });
  });
});


router.get("/stats/:image_name", (req, res) => {
  var image_name = req.params.image_name;
  var mask = `public/data/masks/${image_name}.json`;

  fs.readFile(mask, "utf8", function (err, data) {
    if (err) {
      res.send("0");
    } else {
      var output_data = JSON.parse(data)
      if (output_data.length === undefined){
        res.send("0");
      } else {
        res.send(`${JSON.parse(data).length}`);
      }
    }
  });
});


module.exports = router;
