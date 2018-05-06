
document.getElementById("generate_mask").addEventListener("click", function (e) {
    // TODO(tofull) This process should be serverside
    // But it works for now, so we can keep it until we work on this feature
    console.log("generating masks...");
    fetch(`/api/v1/images`, { method: 'GET' })
        .then(response => response.json())
        .then(data => JSON.parse(data))
        // .then(images_list => images_list.slice(-3,-1))
        .then(images_list => images_list)
        .then(images_list => {
            console.log(`received ${images_list.length} images from the server`);
            console.log("generating one geojson file per polygon, for each image");
            Promise.all(images_list.map(image => fetch(`/api/v1/process/spliter/${image}`)))
            .then((responses)=>{
                console.log("each image has been split");
                return images_list
            })
            .then(images_list => {
                console.log("converting all geojson file of each image into binary masks (tif format) ");
                Promise.all(images_list.map(image => fetch(`/api/v1/process/maskconverter/tif/${image}`)))
                .then((responses)=>{
                    console.log("each geojson file of each image has been converted into binary masks (tif format)")
                    return images_list
                })
                .then(images_list => {
                    console.log("converting all tif files into png files (input required for coco mask generator)")
                    Promise.all(images_list.map(image => fetch(`/api/v1/process/maskconverter/png/${image}`)))
                    .then((responses)=>{
                        console.log("each tif file of each image has been converted into binary masks (png format)")
                        fetch("/api/v1/process/generate_coco_format")
                            .then(response => {
                                console.log("Coco format generated");
                            })
                    })
                })
            })
        })
})