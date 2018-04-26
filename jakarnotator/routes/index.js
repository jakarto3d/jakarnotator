var express = require('express');
var fs = require("fs");
var router = express.Router();


/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Jakarnotator' });
});


/* GET stats page. */
router.get('/stats/', (req, res, next) => {
  res.render('stats', { title: 'Jakarnotator - Analysis' });
});


router.get("/list_annotations", (req, res) => {
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

    res.send(annotation_list_for_jstree_format);
  });
});

module.exports = router;
