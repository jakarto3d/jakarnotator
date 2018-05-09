let express = require('express');
let router = new express.Router();
let bodyParser = require('body-parser');
let path = require('path');
let sharp = require('sharp');
let turf = require('turf');
let glob = require('glob');
let zip = require('express-easy-zip');
let fs = require('fs');
let cargo = require('async/cargo');

router.use(bodyParser.json()); // parse application/json
router.use(bodyParser.urlencoded({extended: true})); // parse application/x-www-form-urlencoded
router.use(zip());


let categoryCounter = {};

// TODO(tofull) jobs should be stacked in working queue (see async.js -> cargo module)
let processSplitCargo = cargo(function(tasks, callback) {
  for (let i = 0; i < tasks.length; i++) {
    processSplit(tasks[i].imageName, tasks[i].req, tasks[i].res);
  }
  callback();
}, 10);


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


router.get('/spliter/:image_name', (req, res) => {
  req.app.app_data.processing_masks_status = {
    available: false, message: 'server splitting polygons (step 1/2)'}; // Avoid multiple calls during processing coco format generator
  let imageName = req.params.image_name;

  processSplitCargo.push({imageName: imageName, req: req, res: res});
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


router.get('/masks_by_categories', function(req, res, next) {
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


/**
 * Generate one geojson file per manual annotation, for a given image
 * Return a response when finishes
 *
 * @param {string} imageName the name of the image to split
 * @param {Request} req request object
 * @param {Response} res response object
 */
function processSplit(imageName, req, res) {
  let mask = `public/data/masks/${imageName}.json`;
  let imageBasename = imageName.replace(/\.[^/.]+$/, '');
  let c = 0;
  resetCategoryCounter(imageBasename);
  fs.readFile(mask, 'utf8', function(err, data) {
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
          if (err) {
            throw err;
          }
          if (c == dataArray.length) {
            return res.send('respond with a resource');
          }
        });
      });
    } else {
      return res.status(404).send('Image data not found');
    }
  });
}


router.get('/generateCoco', function(req, res, next) {
  req.app.app_data.processing_masks_status = {
    available: false, message: 'server generating coco format (step 2/2)',
  }; // Avoid multiple calls during processing coco format generator

  // TODO(tofull) info and licenceList should be outside the code (in a config file for instance)
  const info = {
    'description': 'Jakarto Dataset',
    'url': 'https://www.jakarto.com',
    'version': '0.0.1',
    'year': new Date().getFullYear(),
    'contributor': 'Loic Messal (tofull)',
    'date_created': new Date().toISOString(),
  };

  const licenceList = [
    {
      'id': 1,
      'name': `Licence Creative Commons Attribution - Pas d'Utilisation Commerciale \
- Partage dans les Mêmes Conditions 4.0 International`,
      'url': 'http://creativecommons.org/licenses/by-nc-sa/4.0/',
    },
  ];

  fs.readFile('public/data/annotation_list.json', 'utf8', function(err, data) {
    let categories = JSON.parse(data);
    let imageList = [];
    glob(`public/data/images/*.jpg`, function(er, files) {
      files.forEach((file, index)=>{
          fs.stat(file, function(err, stats) {
            let fileBasename = file.replace(/.*\//, ''); // Remove all the thing before the last slash (server url & api)
            sharp(file).metadata().then(function(metadata) {
              return {width: metadata.width, height: metadata.height};
            }).then((size)=>{
              let imageInfo = {
                licence: 1,
                file_name: fileBasename,
                coco_url: '',
                height: size.height,
                width: size.width,
                date_captured: stats.birthtime,
                flickr_url: '',
                id: index,
              };
              imageList.push(imageInfo);
              if (imageList.length === files.length) {
                glob(`public/data/process/masks/geojson/*.geojson`, function(err, geojsonFiles) {
                  let segmentationList = [];

                  geojsonFiles.forEach(function(geojsonFile, indexGeojsonFile) {
                    fs.readFile(geojsonFile, 'utf8', function(err, geodata) {
                      geodata = JSON.parse(geodata);
                      let segmentation = geodata.geometry.coordinates;
                      let category = geodata.properties.category;

                      let categoryId = categories.filter((item) => item.name === category).map((item) => item.id)[0];

                      let geojsonFileBaseImage = geojsonFile.replace(/.*\//, '').replace(/\_.*/, '') + '.jpg';

                      let polygon = turf.polygon(segmentation);

                      let bbox = turf.bbox(polygon);
                      let [minX, minY, maxX, maxY] = bbox;

                      // let area = turf.area(polygon);
                      // TODO(tofull) turf.js returns area in m², considering x,y are latitude / longitude between -180°/180°... So used an estimation of the area as the surface of the bounding box (at least, polygon's area is less than this value)
                      area = (maxX-minX) * (maxY - minY);

                      let imageId = imageList.filter((item) => item.file_name === geojsonFileBaseImage)
                                             .map((item) => item.id)[0];
                      let segmentationData = {
                        segmentation: segmentation,
                        area: area,
                        iscrowd: 0,
                        image_id: imageId,
                        bbox: bbox,
                        category_id: categoryId,
                        id: indexGeojsonFile,
                      };
                      segmentationList.push(segmentationData);

                      if (segmentationList.length === geojsonFiles.length) {
                        let cocoData = {
                          'info': info,
                          'licenses': licenceList,
                          'categories': categories,
                          'images': imageList,
                          'annotations': segmentationList,
                        };
                        fs.writeFile('public/data/instances_shape_jakartotrain2018.json',
                                      JSON.stringify(cocoData), function(err) {
                          if (err) {
                            throw err;
                          }
                          req.app.app_data.processing_masks_status = {
                            available: true, message: 'server ready',
                          }; // Avoid multiple calls during processing coco format generator
                          res.send('coco generated');
                        });
                      }
                    });
                  });
                });
              }
            });
          });
        });
    });
  });
});
module.exports = router;
