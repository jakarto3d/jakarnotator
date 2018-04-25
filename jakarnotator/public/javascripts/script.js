// window.localStorage.clear();
// TODO(tofull) Fix when socket receive new data : dont erase current editing, or save it...
var width;
var height;
var scaling;
var new_height;
var new_width
var image;
var dataset;
var current_class;
var current_class_css;
var editing_layer;

var images_list;
var img = new Image();

var map = L.map('map', { editable: true }).setView([0.0, 0.0], 11);


L.NewPolygonControl = L.Control.extend({
    options: {
        position: 'topleft'
    },
    onAdd: function (map) {
        var container = L.DomUtil.create('div', 'leaflet-control leaflet-bar'),
            link = L.DomUtil.create('a', '', container);
        link.href = '#';
        link.title = 'Create a new polygon';
        link.innerHTML = '▱';
        L.DomEvent.on(link, 'click', L.DomEvent.stop)
            .on(link, 'click', function () {
                map.editTools.startPolygon();
            });
        return container;
    }
});

map.addControl(new L.NewPolygonControl());

var Z = 90, latlng, redoBuffer = [],
    onKeyDown = function (e) {
        if (e.keyCode == Z) {
            if (!this.editTools._drawingEditor) return;
            if (e.shiftKey) {
                if (redoBuffer.length) this.editTools._drawingEditor.push(redoBuffer.pop());
            } else {
                latlng = this.editTools._drawingEditor.pop();
                if (latlng) redoBuffer.push(latlng);
            }
        }
    };


L.DomEvent.addListener(document, 'keydown', onKeyDown, map);

function save_polygon(e) {
    dataset[img.src] = []
    map.editTools.featuresLayer.eachLayer(function (layer) {
        data = layer.toGeoJSON();
        if (data.type === "FeatureCollection") {
            // I dont know why, but Leaflet.Editable considers a polygon as a FeatureCollection of polygon the second time I draw a polygon. So extract the first (and unique) feature instead !
            data = data.features[0]
        }

        // Check if first coordinate is different from undefined. I dont know why, but Leaflet.Editable deleteShapeAt function doesn't delete enterely the polygon...
        if (data.geometry.coordinates[0][0] !== undefined){  
            if (data.geometry.coordinates[0] !== undefined){
                for (index_point in data.geometry.coordinates[0]) {
                    var [x, y] = data.geometry.coordinates[0][index_point];
                    var x_in_image = Math.round(x / scaling)
                    var y_in_image = Math.round(y / scaling)
                    data.geometry.coordinates[0][index_point] = Array(x_in_image, height - y_in_image)
                }
                dataset[img.src].push(data);
            }
        }

    });

    window.localStorage.setItem("dataset", JSON.stringify(dataset));

    var url_mask = `/masks/${images_list[index_image]}`
    $.ajax({
        url: url_mask,
        type: 'POST',
        data: JSON.stringify(dataset[img.src]),
        contentType: 'application/json',
    }).done(function () {
        socket.emit('send_a_new_json', images_list[index_image]);
    }).fail(function (msg) {
        console.log('Problème de synchronisation...');
    });

}

map.on('editable:drawing:end', function (e) {
    redoBuffer = [];

    var layer = e.layer,
        feature = layer.feature = layer.feature || {}; // Initialize feature

    feature.type = feature.type || "Feature"; // Initialize feature.type
    var props = feature.properties = feature.properties || {}; // Initialize feature.properties
    props.category = current_class;
    props.class_css = current_class_css;

    var selection = document.querySelector("." + current_class_css);
    // if (selection === null) {
    //     console.info("css class is missing : " + current_class_css)
    //     selection = document.querySelector(".annotation_class_default");
    // }
    var style = getComputedStyle(selection);
    layer.setStyle({ fillColor: style.color });

    save_polygon(e)
});

map.on('editable:vertex:dragend', function (e) {
    save_polygon(e)
});

map.on('editable:dragend', function (e) {
    save_polygon(e)
});
map.on('editable:vertex:deleted', function (e) {
    save_polygon(e)
});
map.on('editable:shape:deleted', function (e) {
    save_polygon(e)
});

window.onkeydown = function (event) {
    if (event.keyCode === 188 ){
        $('#help').modal('show');
    }
    // ESC
    if (event.keyCode === 27) {
        if (map.editTools._drawingEditor) map.editTools.stopDrawing();;
        map.editTools.featuresLayer.getLayers().forEach(function (l) {
            if (l instanceof L.LayerGroup) {
                l.getLayers().forEach(function (layer) {
                    if (layer.editEnabled()) {
                        layer.toggleEdit();
                    }
                })
            } else {
                if (l.editEnabled()) {
                    l.toggleEdit();
                }
            }
        })
    }
    // ² ou | # ~ (clavier canadien)
    if (event.keyCode === 222 || event.keyCode === 192) {
        map.editTools.featuresLayer.getLayers().forEach(function (l) {
            if (l instanceof L.LayerGroup) {
                l.getLayers().forEach(function (layer) {
                    if (layer.editEnabled()) {
                        layer.toggleEdit();
                    }
                })
            } else {
                if (l.editEnabled()) {
                    l.toggleEdit();
                }
            }
        })
        if (!map.editTools._drawingEditor) {
            map.editTools.startPolygon(); 
            return;
        }
        map.editTools.stopDrawing();
        map.editTools.startPolygon();
    }
    // F2
    if (event.keyCode === 113) {
        map.editTools.stopDrawing();
        // if (!map.editTools._drawingEditor) map.editTools.stopDrawing();
        document.getElementById("next").click()
        // if (!map.editTools._drawingEditor) map.editTools.startPolygon();
    }
    // F1
    if (event.keyCode === 112) {
        map.editTools.stopDrawing();
        // if (!map.editTools._drawingEditor) map.editTools.stopDrawing();
        document.getElementById("previous").click()
        // if (!map.editTools._drawingEditor) map.editTools.startPolygon();
        event.preventDefault();
    }

};

var deleteShape = function (e) {
    if ((e.originalEvent.ctrlKey || e.originalEvent.metaKey) && this.editEnabled()) {
        this.editor.deleteShapeAt(e.latlng);
    }
};

map.on('layeradd', function (e) {
    if (e.layer instanceof L.Path) e.layer.on('click', L.DomEvent.stop).on('click', deleteShape, e.layer);
    if (e.layer instanceof L.Path) e.layer.on('dblclick', L.DomEvent.stop).on('dblclick', function () {
        // Disable edition for each featuresLayer
        map.editTools.featuresLayer.getLayers().forEach(function (l) {
            if (l instanceof L.LayerGroup) {
                l.getLayers().forEach(function (layer) {
                    if (layer.editEnabled() && layer !== e.layer) {
                        layer.toggleEdit();
                    }
                })
            } else {
                if (l.editEnabled() && l !== e.layer) {
                    l.toggleEdit();
                }
            }
        })
        editing_layer = undefined

        // Activate our featureLayer
        e.layer.toggleEdit();

        if (e.layer.editEnabled()) {
            var category = e.layer.feature.properties.category;
            var instance = $treeview.jstree(true);
            instance.deselect_all(true);
            var branchCont = instance._model.data;
            for (var branchKey in branchCont) {
                var branch = branchCont[branchKey];
                if (branch.text && branch.text === category) {
                    instance.select_node(branchKey);
                    break;
                }
            }
            editing_layer = e.layer;
        } else{
            editing_layer = undefined;
        }
    });
});

var display_polygons = function(){
    var url_mask = `/masks/${images_list[index_image]}`
    $.ajax({
        url: url_mask,
        type: 'GET',
        success: function (data) {
            map.editTools.featuresLayer.clearLayers();
            map.editTools.editLayer.clearLayers();
            if (window.localStorage["dataset"] === undefined) {
                dataset = {};
            } else {
                dataset = JSON.parse(window.localStorage["dataset"]);
            }

            if (dataset[img.src] === undefined) {
                dataset[img.src] = [];
            }
            dataset[img.src] = JSON.parse(data);
            for (index_geojsonFeature in dataset[img.src]) {
                geojsonFeature = dataset[img.src][index_geojsonFeature];
                for (index_point in geojsonFeature.geometry.coordinates[0]) {

                    var [x, y] = geojsonFeature.geometry.coordinates[0][index_point];
                    var x_in_geo = x * scaling
                    var y_in_geo = (height - y) * scaling
                    geojsonFeature.geometry.coordinates[0][index_point] = Array(x_in_geo, y_in_geo);
                }

                L.geoJSON(geojsonFeature).addTo(map.editTools.featuresLayer).getLayers().forEach(function (l) {
                    l.enableEdit();
                    l.toggleEdit();

                    var feature = l.feature = l.feature || {}; // Initialize feature
                    feature.type = feature.type || "Feature"; // Initialize feature.type
                    var props = feature.properties = feature.properties || {}; // Initialize feature.properties
                    props.class_css = props.class_css = props.class_css || "annotation_class_default"

                    var selection = document.querySelector("." + props.class_css);
                    if (selection === null) {

                        console.info("css class is missing : " + props.class_css)
                        l.setStyle({ opacity: 1, fillOpacity:1, fillColor: "#000000" });
                    } else {
                        var style = getComputedStyle(selection);
                        l.setStyle({ fillColor: style.color });
                    }
                }
                );
            }

            console.log("found : " + dataset[img.src].length + ' existing polygon for this image')
        }
    });
}

var socket = io();
socket.on('connect', function () {
    img.onload = function () {

            socket.emit('room-join', images_list[index_image]);
            
            
            width = this.width;
            height = this.height;
            
            if (this.height > this.width) {
                new_height = parseFloat("0." + height)
                scaling = new_height / height
                new_width = width * scaling
            } else {
                new_width = parseFloat("0." + width)
                scaling = new_width / width
                new_height = height * scaling
            }
            
            var imageBounds = [[0.0, 0.0], [new_height, new_width]];
            image = L.imageOverlay(this.src, imageBounds).addTo(map);
            map.setView(new L.LatLng(new_height / 2, new_width / 2))
            
            
            var bounds = L.latLngBounds([0.0, 0.0], [new_height, new_width]);
            
            map.setMaxBounds(bounds);
            map.fitBounds(bounds);
            map.panInsideBounds(bounds, { animate: false });
            map.dragging.enable();
            map.on('drag', function () {
                map.panInsideBounds(bounds, { animate: false });
            });
            
            map.editTools.featuresLayer.clearLayers();
            map.editTools.editLayer.clearLayers();
            
            display_polygons();
    
    }
    
    socket.on('should_refresh_json', function (data) {

        // TODO(tofull) If current polygon is editing
        // Save current polygon in window.localStorage
        // display polygons
        // in display_polygons, load the saved polygon and give it edition mode 
        display_polygons();
    })
});
var index_image;
index_image = parseInt(window.localStorage["index_image"]) || 0;


document.getElementById("next").addEventListener("click", function (e) {
    map.dragging.disable();
    map.off('drag');
    socket.emit('room-leave', images_list[index_image]);

    index_image = index_image + 1;
    if (index_image >= images_list.length) {
        index_image = 0;
    }
    map.removeLayer(image);
    img.src = '/data/images/' + images_list[index_image];
    window.localStorage.setItem("index_image", index_image);
})

document.getElementById("previous").addEventListener("click", function (e) {
    map.dragging.disable();
    map.off('drag');
    socket.emit('room-leave', images_list[index_image]);

    index_image = index_image - 1;
    if (index_image < 0) {
        index_image = images_list.length - 1;
    }
    map.removeLayer(image);
    img.src = '/data/images/' + images_list[index_image];
    window.localStorage.setItem("index_image", index_image);
})

document.getElementById("help_btn").addEventListener("click", function (e) {
    $('#help').modal('show');
})

var annotation_list;
var $treeview = $('#tree')
$.ajax({
    url: "/list_annotations",
    type: 'GET',
    success: function (data) {
        $treeview
            .jstree({
                "core": {
                    "check_callback": true,
                    'data': data,
                    "multiple": false,
                },
                "types": {
                    "default": {
                        "icon": "glyphicon glyphicon-ok"
                    }
                },
                "plugins": ["dnd", "state", "types"]
            });
        $treeview.on('ready.jstree', function () {
                $treeview.jstree('open_all');
                $treeview.on("changed.jstree", function (e, data) {
                    current_class = $treeview.jstree("get_selected", true)[0].text
                    current_class_css = $treeview.jstree("get_selected", true)[0].li_attr.class
                    $("#selected").text(current_class)
        
                    if (editing_layer){
                        var layer = editing_layer,
                            feature = layer.feature = layer.feature || {}; // Initialize feature
        
                        feature.type = feature.type || "Feature"; // Initialize feature.type
                        var props = feature.properties = feature.properties || {}; // Initialize feature.properties
                        props.category = current_class;
                        props.class_css = current_class_css;
        
                        // TODO(tofull) analyse why I used this queryselector...
                        var selection = document.querySelector("." + current_class_css);
                        var style = getComputedStyle(selection);
                        layer.setStyle({ fillColor: style.color });
                        save_polygon(e)
                    }
                });
                $.ajax({
                    url: "/images",
                    type: 'GET',
                    success: function (data) {
                        images_list = JSON.parse(data);
                        img.src = '/data/images/' + images_list[index_image];
                    }
                })
            })
            .bind("loaded.jstree", function (event, data) {
                $("#tree li a").addTouch();
            });
    }
});


document.getElementById("expand_all").addEventListener("click", function (e) {
    $treeview.jstree('open_all');
})


document.getElementById("generate_mask").addEventListener("click", function (e) {
    console.log("done");
    var c0 = 0;
    var c1 = 0;
    var c2 = 0;
    // TODO(tofull) Use fetch instead of $.ajax
    // TODO(tofull) This processing should be on server-side... and doesn't need routes
    images_list.forEach(function(image){
        $.ajax({
            url: `/process/spliter/${image}`,
            complete: function(){
                c0++;
                if (c0 == images_list.length){
                    console.log("spliter done");
                    images_list.forEach(function (image) {
                        $.ajax({
                            url: `/process/maskconverter/tif/${image}`,
                            complete: function(){
                                c1++;
                                if (c1 == images_list.length){
                                    console.log("maskconverter tif done");
                                    images_list.forEach(function (image) {
                                        $.ajax({
                                            url: `/process/maskconverter/png/${image}`,
                                            complete: function () {
                                                c2++;
                                                if (c2 == images_list.length) {
                                                    console.log("maskconverter png done");
                                                    $.ajax({
                                                        url: `/process/generate_coco_format`,
                                                        success: function (data) {
                                                            console.log(data);
                                                            console.log("json coco format generated");
                                                        }
                                                    })
                                                }
                                            }
                                        })
                                    })
                                }
                        }})})
                }
            }
        })
    })
})


$("#search").change(function(e){
    map.dragging.disable();
    map.off('drag');
    socket.emit('room-leave', images_list[index_image]);

    var index_image_temp = images_list.indexOf($("#search").val());
    if (index_image_temp !== -1){
        console.log(index_image);
        index_image = index_image_temp
        map.removeLayer(image);
        img.src = '/data/images/' + images_list[index_image];
        window.localStorage.setItem("index_image", index_image);
    }
})