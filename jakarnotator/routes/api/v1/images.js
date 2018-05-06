var express = require("express");
const redis = require('redis');
const client = redis.createClient({
  host: process.env.HOST_REDIS || 'localhost'
});
var router = express.Router();
var bodyParser = require('body-parser');

router.use(bodyParser.json());  // parse application/json
router.use(bodyParser.urlencoded({ extended: true }));  // parse application/x-www-form-urlencoded

var fs = require("fs");



const get_list_images = (req, res) => {
  var imageFolder = 'public/data/images'
  fs.readdir(imageFolder, (err, files) => {
    // Set the string-key:list_images in our cache.
    // Set cache expiration to 1 hour (60 minutes)
    client.setex("list_images", 3600, JSON.stringify(files));
    res.json(JSON.stringify(files));
  })
}



const getCache = (req, res) => {
  //Check the cache data from the server redis
  client.get("list_images", (err, result) => {
    if (result) {
      console.log("return list_images from cache");
      res.json(result);
    } else {
      get_list_images(req, res);
    }
  });
}

router.get("/", getCache);

module.exports = router;
