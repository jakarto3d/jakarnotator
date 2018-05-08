(function() {
    let socket = io();

    let vue = new Vue({
        el: '#app',
        data: {
            msg: 'Waiting information from server',
            available: false,
        },
    });

    socket.on('connect', function() {
        socket.emit('admin_panel_enter');
        socket.on('processing_masks_status', function(data) {
            console.log('received processing masks status from server');
            console.log(data);
            vue.msg = data.message;
            vue.available = data.available;
        });
    });

    document.getElementById('generate_mask').addEventListener('click', function(e) {
        // TODO(tofull) This process should be serverside
        // But it works for now, so we can keep it until we work on this feature
        console.log('generating masks...');
        fetch(`/api/v1/images`, {method: 'GET'})
            .then((response) => response.json())
            .then((data) => JSON.parse(data))
            .then((imagesList) => imagesList.slice(-3, -1)) // TODO(tofull) Remove this when at least image processing will use async.cargo feature (risk of full memory usage otherwise (each process will be spawn at the same time) -> docker will kill your container)
            .then((imagesList) => imagesList)
            .then((imagesList) => {
                console.log(`received ${imagesList.length} images from the server`);
                console.log('generating one geojson file per polygon, for each image');
                Promise.all(imagesList.map((image) => fetch(`/api/v1/process/spliter/${image}`)))
                .then((responses)=>{
                    console.log('each image has been split');
                    return imagesList;
                })
                .then((imagesList) => {
                    console.log('converting all geojson file of each image into binary masks (tif format)');
                    Promise.all(imagesList.map((image) => fetch(`/api/v1/process/maskconverter/tif/${image}`)))
                    .then((responses)=>{
                        // eslint-disable-next-line max-len
                        console.log('each geojson file of each image has been converted into binary masks (tif format)');
                        return imagesList;
                    })
                    .then((imagesList) => {
                        // eslint-disable-next-line max-len
                        console.log('converting all tif files into png files (input required for coco mask generator)');
                        Promise.all(imagesList.map((image) => fetch(`/api/v1/process/maskconverter/png/${image}`)))
                        .then((responses)=>{
                            // eslint-disable-next-line max-len
                            console.log('each tif file of each image has been converted into binary masks (png format)');
                            fetch('/api/v1/process/generate_coco_format')
                                .then((response) => {
                                    console.log('Coco format generated');
                                });
                        });
                    });
                });
            });
    });
})();
