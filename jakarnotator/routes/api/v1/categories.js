let express = require('express');
let router = new express.Router();

let fs = require('fs');
const redis = require('redis');
const client = redis.createClient({
    host: process.env.HOST_REDIS || 'localhost',
});

const getListAnnotations = (req, res) => {
    let annotationFile = `public/data/annotation_list.json`;

    fs.readFile(annotationFile, 'utf8', (err, data) => {
        if (err) throw err;
        data = JSON.parse(data);

        let annotationListForJstreeFormat = [];

        data.forEach((category) => {
            let newFormatedCategory = {};
            newFormatedCategory.id = category.id;
            if (category.supercategory === 'shape') {
                newFormatedCategory.parent = '#';
            } else {
                let parent = data.filter((item) => item.name == category.supercategory)[0];
                newFormatedCategory.parent = parent.id;
            }
            newFormatedCategory.text = category.name;
            if (category.name === 'default') {
                newFormatedCategory.state = {'selected': true};
            }
            newFormatedCategory.li_attr = {'class': `annotation_class_${category.name}`};

            annotationListForJstreeFormat.push(newFormatedCategory);
        });

        // Set the string-key:list_annotation in our cache.
        // Set cache expiration to 1 hour (60 minutes)
        client.setex('list_annotation', 3600, JSON.stringify(annotationListForJstreeFormat));

        res.send(JSON.stringify(annotationListForJstreeFormat));
    });
};

const getCache = (req, res) => {
    // Check the cache data from the server redis
    client.get('list_annotation', (err, result) => {
        if (result) {
            console.log('return list_annotation from cache');
            res.send(result);
        } else {
            console.log('return list_annotation without cache');
            getListAnnotations(req, res);
        }
    });
};

router.get('/', getCache);


module.exports = router;
