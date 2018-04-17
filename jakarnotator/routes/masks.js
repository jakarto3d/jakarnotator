var express = require("express");
var router = express.Router();
var bodyParser = require('body-parser');

router.use(bodyParser.json());  // parse application/json
router.use(bodyParser.urlencoded({ extended: true }));  // parse application/x-www-form-urlencoded

var fs = require("fs");

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
module.exports = router;
