let express = require('express');
let router = new express.Router();

router.use('/categories', require('./api/v1/categories'));
router.use('/images', require('./api/v1/images'));
router.use('/masks', require('./api/v1/masks'));
router.use('/process', require('./api/v1/process'));

module.exports = router;
