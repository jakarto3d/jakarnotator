let express = require('express');
let router = new express.Router();
let bodyParser = require('body-parser');
let fs = require('fs');

router.use(bodyParser.json()); // parse application/json
router.use(bodyParser.urlencoded({extended: true})); // parse application/x-www-form-urlencoded


router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});


router.get('/:image_name', (req, res) => {
  let imageName = req.params.image_name;
  let mask = `public/data/masks/${imageName}.json`;

  fs.readFile(mask, 'utf8', function(err, data) {
    if (err) {
      let emptyData = '{}'; // TODO(tofull) maybe it should be '[]'
      // TODO(tofull) write file only if data/images/${image_name} exists
      fs.writeFile(mask, emptyData, function(err) {
        if (err) throw err;
        res.send(emptyData);
      });
    } else {
      res.send(data);
    }
  });
});


router.post('/:image_name', (req, res) => {
  let imageName = req.params.image_name;
  let mask = `public/data/masks/${imageName}.json`;

  let updatedData = JSON.stringify(req.body);

  fs.writeFile(mask, updatedData, function(err) {
    if (err) throw err;
    res.json({message: `${imageName} updated`});
  });
});


router.get('/stats/:image_name', (req, res) => {
  let imageName = req.params.image_name;
  let mask = `public/data/masks/${imageName}.json`;

  fs.readFile(mask, 'utf8', function(err, data) {
    let returnValue = 0;
    if (!err) {
      let outputData = JSON.parse(data);
      if (outputData.length !== undefined) {
        returnValue = JSON.parse(data).length;
      }
    }
    res.send(JSON.stringify({number_masks: returnValue}));
  });
});


module.exports = router;
