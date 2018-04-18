var express = require('express');
var fs = require("fs");
var router = express.Router();


/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});


router.get("/list_annotations", (req, res) => {
  console.log("file");
  var annotation_file = `public/data/annotation_list.json`;

  console.log(annotation_file);
  fs.readFile(annotation_file, "utf8", function (err, data) {
    if (err) throw err;
    var data = JSON.parse(data);
    // console.log(data);

    var annotation_list_for_jstree_format = []

    data.forEach(function(category){
      var new_formated_category = {}
      new_formated_category.id = category.id
      if (category.supercategory === "shape"){
        new_formated_category.parent = "#"
      } else {
        var parent = data.filter(function (item) {
          return item.name == category.supercategory;
        })[0];
        new_formated_category.parent = parent.id
      }
      new_formated_category.text = category.name
      if (category.name === "default") {
        new_formated_category.state = { "selected": true }
      }
      new_formated_category.li_attr = { "class": `annotation_class_${category.name}` }

      annotation_list_for_jstree_format.push(new_formated_category)
      // console.log(category.name);
    })

    // annotation_list_for_jstree_format.push(data[0])
    // console.log(annotation_list_for_jstree_format)

    res.send(annotation_list_for_jstree_format);
    // res.send(JSON.stringify(annotation_list_for_jstree_format));
  });
});

// { "id": "0", "parent": "#", "text": "Default label", "state": { "selected": true }, "li_attr": { "class": "color-default" } },
// { "id": "1", "parent": "#", "text": "Signalisation", "li_attr": { "class": "color-signalisation" } },
// { "id": "2", "parent": "#", "text": "Végétation", "li_attr": { "class": "color-vegetation" } },
// { "id": "2.1", "parent": "2", "text": "Arbre", "li_attr": { "class": "color-vegetation" } },
// { "id": "2.2", "parent": "2", "text": "Nature", "li_attr": { "class": "color-vegetation" } },
// { "id": "3", "parent": "#", "text": "People", "li_attr": { "class": "color-human" } },

module.exports = router;
