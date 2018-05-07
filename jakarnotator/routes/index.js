let express = require('express');
let router = new express.Router();

// Webapp pages
router.get('/', (req, res, next) => {
  res.render('index', {title: 'Jakarnotator - Editor'});
});

router.get('/stats/', (req, res, next) => {
  res.render('stats', {title: 'Jakarnotator - Statistics'});
});

router.get('/admin/', (req, res, next) => {
  res.render('admin', {title: 'Jakarnotator - Administration'});
});

router.get('/about/', (req, res, next) => {
  res.render('about', {title: 'Jakarnotator - About'});
});

router.get('/validator/', (req, res, next) => {
  res.render('validator', {title: 'Jakarnotator - Validator'});
});

// API
router.use('/api/v1', require('./api_v1'));

// export default router;
module.exports = router;
