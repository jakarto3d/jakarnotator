var express = require("express");
var router = express.Router();
var bodyParser = require('body-parser');
var Jimp = require("jimp");
var path = require("path");
var sharp = require("sharp");
var glob = require("glob");
var zip = require('express-easy-zip');
var fs = require("fs");
const { spawn } = require('child_process');

router.use(bodyParser.json());  // parse application/json
router.use(bodyParser.urlencoded({ extended: true }));  // parse application/x-www-form-urlencoded
router.use(zip());


// TODO(tofull) jobs should be stacked in working queue (see async.js -> cargo module)
// TODO(tofull) There is no need to use gdal rasterize, gdal translate, and pycocotools + pycococreator because we already have the polygon thanks to the mask

var category_counter = {};
var executable_extension = ""
var isWin = process.platform === "win32";
if (isWin){
  executable_extension = ".exe"
}

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


router.get("/reset", function (req, res, next) {
  reset_category_counter();
  res.send("Reset each categorie count for all images");
});


router.get("/reset/:image_name", function (req, res) {
  var image_name = req.params.image_name;
  var mask = `public/data/masks/${image_name}.json`;
  var image_basename = image_name.replace(/\.[^/.]+$/, "");

  reset_category_counter(image_basename);
  res.send(`Reset each categorie count for image ${image_basename}`);
});


router.get("/spliter/:image_name", (req, res) => {
  req.app.app_data.processing_masks_status = { available: false, message: "server splitting polygons (step 1/4)" };  // Avoid multiple calls during processing coco format generator
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
  req.app.app_data.processing_masks_status = { available: false, message: "server generating tif (step 2/4)" };  // Avoid multiple calls during processing coco format generator
  // console.log("Wanna convert geojson to tif")
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
        var gdal_command = `gdal_rasterize${executable_extension} -burn 255 -burn 255 -burn 255 -ts ${w} ${h} -te 0 0 ${w} ${h} "${file}" "${output_file}"`
        // console.log(gdal_command)
        var gdal = spawn(gdal_command, [], { shell: true });

        // gdal.stderr.on('data', (data) => {
        //   console.log(`gdal stderr: ${data}`);
        // });
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
  req.app.app_data.processing_masks_status = { available: false, message: "server generating png (step 3/4)" };  // Avoid multiple calls during processing coco format generator
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

      var output_file_correct = `public/data/process/masks/png/${file_basename}.png`
      var output_file = `public/data/process/masks/png/${file_basename}_toflip.png`
      // call gdal
      var gdal_command = `gdal_translate${executable_extension} -of PNG  "${file}" "${output_file}"`
      var gdal = spawn(gdal_command, [], { shell: true });
      gdal.on('close', function (code) {
        // c++;
        // if (c == files.length) {
        //   return res.send("respond with a resource");
        // }
        sharp(output_file).flip().toFile(output_file_correct, function (err) {
          console.log(err)
          fs.unlink(output_file, function (error) {
            if (error) {
              throw error;
            }
            c++;
            if (c == files.length) {
              return res.send("respond with a resource");
            }
          });

        });
      })
    })
  });
});



router.get("/generate_coco_format", (req, res) => {
  req.app.app_data.processing_masks_status = { available: false, message: "server generating masks (step 4/4)" };  // Avoid multiple calls during processing coco format generator
  // TODO(tofull) move python script from data folder
  var cococreator_command = `cd public/data/ && python3 shapes_to_coco.py`
  var cococreator = spawn(cococreator_command, [], { shell: true });
  cococreator.stdout.on('data', (data) => {
    console.log(`cococreator stdout: ${data}`);
  });
  cococreator.stderr.on('data', (data) => {
    console.log(`cococreator stderr: ${data}`);
  });
  cococreator.on('close', function (code) {
    req.app.app_data.processing_masks_status = { available: true, message: "server ready" };  // Avoid multiple calls during processing coco format generator

    res.send("json coco format generated");
  });
});



router.get('/download', function (req, res, next) {
  // Create a download route for downloading images and coco formated data in a zip file
  // http://programmerblog.net/zip-or-unzip-files-using-nodejs-tutorial/

  var export_files = []
  var imageFolder = 'public/data/images'
  fs.readdir(imageFolder, (err, files) => {
    files.forEach(function (file) {
      // TODO(tofull) remove the hardcoded location of files
      export_files.push({path: path.join(__dirname, `../../../public/data/images/${file}`), name: `images/${file}` })
    })
    export_files.push({ path: path.join(__dirname, '../../../public/data/instances_shape_jakartotrain2018.json'), name: 'instances_shape_jakartotrain2018.json' })

    res.zip({
      files: export_files,
      filename: 'jakartoDataset_train2018.zip'
    });
  })

});


router.get("/test", function(req, res, next){
  var output = {}
  var all_files_processed = 0
  glob(`public/data/masks/*.json`, function (er, files) {
    files.forEach(function (file) {
      fs.readFile(file, "utf8", function (err, data) {
        var data_array = JSON.parse(data);
        var all_feature_processed = 0
        if (data_array.length > 0){
          data_array.forEach(function (item) {
            var category = item.properties.category;
            if (output[category] === undefined) {
              output[category] = 0;
            } else {
              output[category]++;
            }
            all_feature_processed++;
            if (all_feature_processed == data_array.length){
              all_files_processed++;
            }
            if (all_files_processed == files.length){
              res.send(JSON.stringify(output));
            }
          })
        } else {
            all_files_processed++;
          if (all_files_processed == files.length){
            res.send(JSON.stringify(output));
          }
        }
      })
    })
  })
})


module.exports = router;
