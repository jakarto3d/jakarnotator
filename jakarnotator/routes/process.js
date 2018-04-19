var express = require("express");
var router = express.Router();
var bodyParser = require('body-parser');
var Jimp = require("jimp");
var sharp = require("sharp");
var glob = require("glob");
const { spawn } = require('child_process');

router.use(bodyParser.json());  // parse application/json
router.use(bodyParser.urlencoded({ extended: true }));  // parse application/x-www-form-urlencoded

var fs = require("fs");
var category_counter = {};


function reset_category_counter(image_basename) {
  if (image_basename) {
    category_counter[image_basename] = {};
  } else {
    category_counter = {};
  }
}

function update_category_counter(image_basename, category) {
  if (category_counter[image_basename] === undefined) {
    category_counter[image_basename] = {}
  }

  if (category_counter[image_basename][category] === undefined) {
    category_counter[image_basename][category] = 0;
  } else {
    category_counter[image_basename][category]++;
  }
  return category_counter[image_basename][category]
}

/* GET users listing. */
router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

router.get("/reset", function (req, res, next) {
  reset_category_counter();
  res.send("respond with a resource");
});

router.get("/reset/:image_name", function (req, res) {
  var image_name = req.params.image_name;
  var mask = `public/data/masks/${image_name}.json`;
  var image_basename = image_name.replace(/\.[^/.]+$/, "");

  reset_category_counter(image_basename);
  res.send("respond with a resource");
});

router.get("/spliter/:image_name", (req, res) => {
  var image_name = req.params.image_name;
  var mask = `public/data/masks/${image_name}.json`;
  var image_basename = image_name.replace(/\.[^/.]+$/, "");

  var c = 0;

  reset_category_counter(image_basename);
  fs.readFile(mask, "utf8", function (err, data) {
    // if (err) throw err;
    if (err){
      return res.status(404).send("no data");
    };
    var data_array = JSON.parse(data);
    if (data_array.length > 0){
      data_array.forEach(function (item) {
        var category = item.properties.category;
        var index = update_category_counter(image_basename, category);
        var filename = `${image_basename}_${category}_${index}`
        var path = `public/data/process/masks/geojson/${filename}.geojson`;
        fs.writeFile(path, JSON.stringify(item), function (err) {
          c++;
          if (err) throw err;
          // console.log(`${filename} created`);
          if (c == data_array.length) {
            return res.send("respond with a resource");
          }
        });
      })
    } else {
      return res.status(404).send("Image data not found");
    }
  });
});


router.get("/maskconverter/tif/:image_name", (req, res) => {
  var image_name = req.params.image_name;
  var image_basename = image_name.replace(/\.[^/.]+$/, "");
  var image_path = `public/data/images/${image_name}`;

  glob(`public/data/process/masks/geojson/${image_basename}*.geojson`, function (er, files) {
    // console.log(er)
    // console.log(files)
    if (files.length == 0){
      return res.status(404).send("Corresponding data not found");
    }
    var c = 0;
    // get size of the image
    var image = new Jimp(image_path, function (err, image) {
      var w = image.bitmap.width; // the width of the image
      var h = image.bitmap.height; // the height of the image
      // console.log(w, h);
  
      // get all masks geojson to transform
      files.forEach(function (file) {
        // console.log(file);
        var file_basename = file.replace(/.*\//, "")  // Remove all the thing before the last slash (server url & api)
          .replace(/\.[^/.]+$/, "")  // Remove all the thing after the last . (extension)

        // console.log(file_basename);
        var output_file = `public/data/process/masks/tif/${file_basename}.tif`
        // call gdal
        var gdal_command = `gdal_rasterize.exe -burn 255 -burn 255 -burn 255 -ts ${w} ${h} -te 0 0 ${w} ${h} "${file}" "${output_file}"`
        // console.log(gdal_command)
        var gdal = spawn(gdal_command, [], { shell: true });

        gdal.on('close', function (code) {
          c++;
          // console.log(`child process exited with code ${code}`);
          if (c == files.length) {
            return res.send("respond with a resource");
          }
        })
      })
    });
  })


});


router.get("/maskconverter/png/:image_name", (req, res) => {
  var image_name = req.params.image_name;
  var image_basename = image_name.replace(/\.[^/.]+$/, "");
  var image_path = `public/data/images/${image_name}`;
  var c = 0;


  // get all masks geojson to transform
  glob(`public/data/process/masks/tif/${image_basename}*.tif`, function (er, files) {
    if (files.length == 0) {
      return res.status(404).send("Corresponding data not found");
    }
    files.forEach(function (file) {
      var file_basename = file.replace(/.*\//, "")  // Remove all the thing before the last slash (server url & api)
        .replace(/\.[^/.]+$/, "")  // Remove all the thing after the last . (extension)

      // console.log(file_basename);
      var output_file = `public/data/process/masks/png/${file_basename}.png`
      // call gdal
      var gdal_command = `gdal_translate.exe -of PNG  "${file}" "${output_file}"`
      // console.log(gdal_command)
      var gdal = spawn(gdal_command, [], { shell: true });
      // gdal.stdout.on('data', (data) => {
      //   console.log(`stdout: ${data}`);
      // });
      // gdal.stderr.on('data', (data) => {
      //   console.log(`stderr: ${data}`);
      // });
      gdal.on('close', function (code) {
        sharp(output_file).flip().toFile(output_file, function (err) {
          c++;
          if (c == files.length) {
            return res.send("respond with a resource");
          }

        });
        // var image = new Jimp(output_file, function (err, image) {
        //   console.log(err);
        //   console.log(image);
        //   image.flip(false, true).write(output_file, function(){
        //   });
        // })
      })
    })
  });
});



router.get("/generate_coco_format", (req, res) => {

  var cococreator_command = `cd public/data/ && python shapes_to_coco.py`
  var cococreator = spawn(cococreator_command, [], { shell: true });
  cococreator.stdout.on('data', (data) => {
    console.log(`cococreator stdout: ${data}`);
  });
  cococreator.stderr.on('data', (data) => {
    console.log(`cococreator stderr: ${data}`);
  });
  cococreator.on('close', function (code) {
    res.send("json coco format generated");
  });
});

module.exports = router;
