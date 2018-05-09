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
            .then((imagesList) => imagesList)
            .then((imagesList) => {
                console.log(`received ${imagesList.length} images from the server`);
                console.log('generating one geojson file per polygon, for each image');
                Promise.all(imagesList.map((image) => fetch(`/api/v1/process/spliter/${image}`)))
                .then((responses)=>{
                    console.log('each image has been split');
                    return imagesList;
                })
                .then((responses)=>{
                    fetch('/api/v1/process/generateCoco')
                        .then((response) => {
                            console.log('Coco format generated so fast');
                        });
                });
            });
    });
})();
