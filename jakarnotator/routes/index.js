var express = require('express');
var fs = require("fs");
const redis = require('redis');
const client = redis.createClient({
  host: process.env.HOST_REDIS || 'localhost'
});
var router = express.Router();


/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Jakarnotator' });
});


/* GET stats page. */
router.get('/stats/', (req, res, next) => {
  res.render('stats', { title: 'Jakarnotator - Statistics' });
});


const get_list_annotations = (req, res) => {
  var annotation_file = `public/data/annotation_list.json`;
  
  fs.readFile(annotation_file, "utf8", (err, data) => {
    if (err) throw err;
    var data = JSON.parse(data);
  
    var annotation_list_for_jstree_format = []
  
    data.forEach(category => {
      var new_formated_category = {}
      new_formated_category.id = category.id
      if (category.supercategory === "shape"){
        new_formated_category.parent = "#"
      } else {
        var parent = data.filter(item => item.name == category.supercategory)[0];
        new_formated_category.parent = parent.id
      }
      new_formated_category.text = category.name
      if (category.name === "default") {
        new_formated_category.state = { "selected": true }
      }
      new_formated_category.li_attr = { "class": `annotation_class_${category.name}` }
  
      annotation_list_for_jstree_format.push(new_formated_category)
    })
  
    // Set the string-key:list_annotation in our cache.
    // Set cache expiration to 1 hour (60 minutes)
    client.setex("list_annotation", 3600, JSON.stringify(annotation_list_for_jstree_format));

    res.send(JSON.stringify(annotation_list_for_jstree_format));
  });

}

const getCache = (req, res) => {
  //Check the cache data from the server redis
  client.get("list_annotation", (err, result) => {
    if (result) {
      console.log("return list_annotation from cache");
      res.send(result);
    } else {
      console.log("return list_annotation without cache");
      get_list_annotations(req, res);
    }
  });
}

router.get("/list_annotations", getCache);

module.exports = router;
