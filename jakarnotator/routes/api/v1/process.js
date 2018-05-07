let express = require('express');
let router = new express.Router();
let bodyParser = require('body-parser');
let Jimp = require('jimp');
let path = require('path');
let sharp = require('sharp');
let glob = require('glob');
let zip = require('express-easy-zip');
let fs = require('fs');
const {spawn} = require('child_process');

router.use(bodyParser.json()); // parse application/json
router.use(bodyParser.urlencoded({extended: true})); // parse application/x-www-form-urlencoded
router.use(zip());


// TODO(tofull) jobs should be stacked in working queue (see async.js -> cargo module)
// TODO(tofull) There is no need to use gdal rasterize, gdal translate, and pycocotools + pycococreator because we already have the polygon thanks to the mask

let categoryCounter = {};
let executableExtension = '';
let isWin = process.platform === 'win32';
if (isWin) {
  executableExtension = '.exe';
}
/**
 * Reset the categoryCounter variable to default
 *
 * @param {string} imageBasename name of the image
 */
function resetCategoryCounter(imageBasename) {
  if (imageBasename) {
    categoryCounter[imageBasename] = {};
  } else {
    categoryCounter = {};
  }
}

/**
 * Increment the categoryCounter for a given image
 *
 * @param {any} imageBasename name of the image
 * @param {any} category category to increment
 * @return {int} new value of the category for the image imageBasename
 */
function updateCategoryCounter(imageBasename, category) {
  if (categoryCounter[imageBasename] === undefined) {
    categoryCounter[imageBasename] = {};
  }

  if (categoryCounter[imageBasename][category] === undefined) {
    categoryCounter[imageBasename][category] = 0;
  } else {
    categoryCounter[imageBasename][category]++;
  }
  return categoryCounter[imageBasename][category];
}


router.get('/reset', function(req, res, next) {
  resetCategoryCounter();
  res.send('Reset each categorie count for all images');
});


router.get('/reset/:image_name', function(req, res) {
  let imageName = req.params.image_name;
  let imageBasename = imageName.replace(/\.[^/.]+$/, '');

  resetCategoryCounter(imageBasename);
  res.send(`Reset each categorie count for image ${imageBasename}`);
});


router.get('/spliter/:image_name', (req, res) => {
  req.app.app_data.processing_masks_status = {
    available: false, message: 'server splitting polygons (step 1/4)'}; // Avoid multiple calls during processing coco format generator
  let imageName = req.params.image_name;
  let mask = `public/data/masks/${imageName}.json`;
  let imageBasename = imageName.replace(/\.[^/.]+$/, '');

  let c = 0;

  resetCategoryCounter(imageBasename);
  fs.readFile(mask, 'utf8', function(err, data) {
    // if (err) throw err;
    if (err) {
      return res.status(404).send('no data');
    };
    let dataArray = JSON.parse(data);
    if (dataArray.length > 0) {
      dataArray.forEach(function(item) {
        let category = item.properties.category;
        let index = updateCategoryCounter(imageBasename, category);
        let filename = `${imageBasename}_${category}_${index}`;
        let path = `public/data/process/masks/geojson/${filename}.geojson`;
        fs.writeFile(path, JSON.stringify(item), function(err) {
          c++;
          if (err) throw err;
          // console.log(`${filename} created`);
          if (c == dataArray.length) {
            return res.send('respond with a resource');
          }
        });
      });
    } else {
      return res.status(404).send('Image data not found');
    }
  });
});


router.get('/maskconverter/tif/:image_name', (req, res) => {
  req.app.app_data.processing_masks_status = {
    available: false, message: 'server generating tif (step 2/4)'}; // Avoid multiple calls during processing coco format generator
  // console.log('Wanna convert geojson to tif')
  let imageName = req.params.image_name;
  let imageBasename = imageName.replace(/\.[^/.]+$/, '');
  let imagePath = `public/data/images/${imageName}`;

  glob(`public/data/process/masks/geojson/${imageBasename}*.geojson`, function(er, files) {
    // console.log(er)
    // console.log(files)
    if (files.length == 0) {
      return res.status(404).send('Corresponding data not found');
    }
    let c = 0;
    // get size of the image
    new Jimp(imagePath, function(err, image) {
      let w = image.bitmap.width; // the width of the image
      let h = image.bitmap.height; // the height of the image
      // console.log(w, h);

      // get all masks geojson to transform
      files.forEach(function(file) {
        // console.log(file);
        let fileBasename = file.replace(/.*\//, '') // Remove all the thing before the last slash (server url & api)
          .replace(/\.[^/.]+$/, ''); // Remove all the thing after the last . (extension)

        // console.log(file_basename);
        let outputFile = `public/data/process/masks/tif/${fileBasename}.tif`;
        // call gdal
        // eslint-disable-next-line max-len
        let gdalCommand = `gdal_rasterize${executableExtension} -burn 255 -burn 255 -burn 255 -ts ${w} ${h} -te 0 0 ${w} ${h} "${file}" "${outputFile}"`;
        // console.log(gdal_command)
        let gdal = spawn(gdalCommand, [], {shell: true});

        // gdal.stderr.on('data', (data) => {
        //   console.log(`gdal stderr: ${data}`);
        // });
        gdal.on('close', function(code) {
          c++;
          // console.log(`child process exited with code ${code}`);
          if (c == files.length) {
            return res.send('respond with a resource');
          }
        });
      });
    });
  });
});


router.get('/maskconverter/png/:image_name', (req, res) => {
  req.app.app_data.processing_masks_status = {
    available: false, message: 'server generating png (step 3/4)'}; // Avoid multiple calls during processing coco format generator
  let imageName = req.params.image_name;
  let imageBasename = imageName.replace(/\.[^/.]+$/, '');
  let c = 0;


  // get all masks geojson to transform
  glob(`public/data/process/masks/tif/${imageBasename}*.tif`, function(er, files) {
    if (files.length == 0) {
      return res.status(404).send('Corresponding data not found');
    }
    files.forEach(function(file) {
      let fileBasename = file.replace(/.*\//, '') // Remove all the thing before the last slash (server url & api)
        .replace(/\.[^/.]+$/, ''); // Remove all the thing after the last . (extension)

      let outputFileCorrect = `public/data/process/masks/png/${fileBasename}.png`;
      let outputFileTemp = `public/data/process/masks/png/${fileBasename}_toflip.png`;
      // call gdal
      // eslint-disable-next-line max-len
      let gdalCommand = `gdal_translate${executableExtension} -of PNG  "${file}" "${outputFileTemp}"`;
      let gdal = spawn(gdalCommand, [], {shell: true});
      gdal.on('close', function(code) {
        // c++;
        // if (c == files.length) {
        //   return res.send('respond with a resource');
        // }
        sharp(outputFileTemp).flip().toFile(outputFileCorrect, function(err) {
          console.log(err);
          fs.unlink(outputFileTemp, function(error) {
            if (error) {
              throw error;
            }
            c++;
            if (c == files.length) {
              return res.send('respond with a resource');
            }
          });
        });
      });
    });
  });
});


router.get('/generate_coco_format', (req, res) => {
  req.app.app_data.processing_masks_status = {
    available: false, message: 'server generating masks (step 4/4)'}; // Avoid multiple calls during processing coco format generator
  // TODO(tofull) move python script from data folder
  let cococreatorCommand = `cd public/data/ && python3 shapes_to_coco.py`;
  let cococreator = spawn(cococreatorCommand, [], {shell: true});
  cococreator.stdout.on('data', (data) => {
    console.log(`cococreator stdout: ${data}`);
  });
  cococreator.stderr.on('data', (data) => {
    console.log(`cococreator stderr: ${data}`);
  });
  cococreator.on('close', function(code) {
    req.app.app_data.processing_masks_status = {available: true, message: 'server ready'}; // Avoid multiple calls during processing coco format generator

    res.send('json coco format generated');
  });
});


router.get('/download', function(req, res, next) {
  // Create a download route for downloading images and coco formated data in a zip file
  // http://programmerblog.net/zip-or-unzip-files-using-nodejs-tutorial/

  let exportFiles = [];
  let imageFolder = 'public/data/images';
  fs.readdir(imageFolder, (err, files) => {
    files.forEach(function(file) {
      // TODO(tofull) remove the hardcoded location of files
      exportFiles.push({
        path: path.join(__dirname, `../../../public/data/images/${file}`),
        name: `images/${file}`,
      });
    });
    exportFiles.push({
      path: path.join(__dirname, '../../../public/data/instances_shape_jakartotrain2018.json'),
      name: 'instances_shape_jakartotrain2018.json',
    });

    res.zip({
      files: exportFiles,
      filename: 'jakartoDataset_train2018.zip',
    });
  });
});


router.get('/test', function(req, res, next) {
  let output = {};
  let allFilesProcessed = 0;
  glob(`public/data/masks/*.json`, function(er, files) {
    files.forEach(function(file) {
      fs.readFile(file, 'utf8', function(err, data) {
        let dataArray = JSON.parse(data);
        let allFeatureProcessed = 0;
        if (dataArray.length > 0) {
          dataArray.forEach(function(item) {
            let category = item.properties.category;
            if (output[category] === undefined) {
              output[category] = 0;
            } else {
              output[category]++;
            }
            allFeatureProcessed++;
            if (allFeatureProcessed == dataArray.length) {
              allFilesProcessed++;
            }
            if (allFilesProcessed == files.length) {
              res.send(JSON.stringify(output));
            }
          });
        } else {
            allFilesProcessed++;
          if (allFilesProcessed == files.length) {
            res.send(JSON.stringify(output));
          }
        }
      });
    });
  });
});


module.exports = router;
