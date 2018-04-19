#!/usr/bin/env python3

import datetime
import json
import os
import re
import sys
import fnmatch
from PIL import Image
from PIL import ImageFile
import numpy as np
from pycococreatortools import pycococreatortools
ImageFile.LOAD_TRUNCATED_IMAGES = True
ROOT_DIR = '.'
IMAGE_DIR = os.path.join(ROOT_DIR, "images")
ANNOTATION_DIR = os.path.join(ROOT_DIR, "process/masks/png")
current_year = datetime.datetime.now().year
OUTPUT_JSON = "instances_shape_jakartotrain{}.json".format(current_year)

INFO = {
    "description": "Jakarto Dataset",
    "url": "https://jakarto.com",
    "version": "0.0.1",
    "year": current_year,
    "contributor": "Loic Messal (tofull)",
    "date_created": datetime.datetime.utcnow().isoformat(' ')
}

LICENSES = [
    {
        "id": 1,
        "name": "Licence Creative Commons Attribution - Pas d’Utilisation Commerciale - Partage dans les Mêmes Conditions 4.0 International",
        "url": "http://creativecommons.org/licenses/by-nc-sa/4.0/"
    }
]

with open('annotation_list.json') as data_file:    
    CATEGORIES = json.load(data_file)

def filter_for_jpeg(root, files):
    file_types = ['*.jpeg', '*.jpg']
    file_types = r'|'.join([fnmatch.translate(x) for x in file_types])
    files = [os.path.join(root, f) for f in files]
    files = [f for f in files if re.match(file_types, f)]
    
    return files

def filter_for_annotations(root, files, image_filename):
    file_types = ['*.png']
    file_types = r'|'.join([fnmatch.translate(x) for x in file_types])
    basename_no_extension = os.path.splitext(os.path.basename(image_filename))[0]
    file_name_prefix = basename_no_extension + '.*'
    files = [os.path.join(root, f) for f in files]
    files = [f for f in files if re.match(file_types, f)]
    files = [f for f in files if re.match(file_name_prefix, os.path.splitext(os.path.basename(f))[0])]

    return files

def memoize(f):
    memo = {}
    def helper(x):
        if x not in memo:            
            memo[x] = f(x)
        return memo[x]
    return helper

@memoize
def find_category(cat_name):
    return [category for category in CATEGORIES if(category['name'] == cat_name)][0]

def main():

    coco_output = {
        "info": INFO,
        "licenses": LICENSES,
        "categories": CATEGORIES,
        "images": [],
        "annotations": []
    }

    image_id = 1
    segmentation_id = 1
    
    # filter for jpeg images
    for root, _, files in os.walk(IMAGE_DIR):
        image_files = filter_for_jpeg(root, files)

        # go through each image
        for image_filename in image_files:
            image = Image.open(image_filename)
            image_info = pycococreatortools.create_image_info(
                image_id, os.path.basename(image_filename), image.size)
            del image
            coco_output["images"].append(image_info)

            # filter for associated png annotations
            for root, _, files in os.walk(ANNOTATION_DIR):
                annotation_files = filter_for_annotations(root, files, image_filename)

                # go through each associated annotation
                for annotation_filename in annotation_files:
                    cat_name = annotation_filename.rsplit('_', 2)[-2]
                    category_annotation = find_category(cat_name)
                    class_id = category_annotation["id"]

                    category_info = {'id': class_id, 'is_crowd': 'crowd' in image_filename}
                    image_annotation = Image.open(annotation_filename)
                    binary_mask = np.asarray(image_annotation.convert('1')).astype(np.uint8)
                    
                    annotation_info = pycococreatortools.create_annotation_info(
                        segmentation_id, image_id, category_info, binary_mask,
                        image_annotation.size, tolerance=2)
                    del image_annotation

                    if annotation_info is not None:
                        coco_output["annotations"].append(annotation_info)

                    segmentation_id = segmentation_id + 1

            image_id = image_id + 1

    with open('{}/{}'.format(ROOT_DIR, OUTPUT_JSON), 'w') as output_json_file:
        json.dump(coco_output, output_json_file)


if __name__ == "__main__":
    main()
