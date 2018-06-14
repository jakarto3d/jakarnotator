(function() {
    // window.localStorage.clear();
    // window.sessionStorage.clear();

    let indexImage;
    let width;
    let height;
    let scaling;
    let newHeight;
    let newWidth;
    let image;
    let dataset;
    let currentClass;
    let currentClassCss;
    let editingLayer;
    let DONTSAVE = false;
    let imagesList;
    let img = new Image();
    let map = L.map('map', {editable: true, attributionControl: false}).setView([0.0, 0.0], 11);

    window.sessionStorage.removeItem('editing_polygon');
    $('input[placeholder]').each(function() {
        $(this).attr('size', $(this).attr('placeholder').length);
    });

    Vue.component('v-select', VueSelect.VueSelect);
    let searchbar = new Vue({
            el: '#searchbar',
            data: {
                options: [],
                selected: null,
                current: null,
        },
        methods: {
            change_image: function(optionItem) {
                if (! this.options.includes(optionItem)) {
                    // the given option_item is not in the list. Get default index_image
                    optionItem = this.options.find((item) => item.label === imagesList[indexImage]);
                }
                map.dragging.disable();
                map.off('drag');
                socket.emit('room-leave', optionItem.label);
                if (image) {
                    map.removeLayer(image);
                }
                indexImage = optionItem.id;
                img.src = '/data/images/' + optionItem.label;
                window.sessionStorage.setItem('index_image', optionItem.id);
            },
            if_selected_change: function(event) {
                // N’utilisez pas les fonctions fléchées sur une propriété ou fonction de rappel d’une instance
                // Comme les fonctions fléchées sont liées au contexte parent, this ne sera pas l’instance de Vue
                // https://fr.vuejs.org/v2/guide/instance.html
                if (event) {
                    this.change_image(event);
                }
            },
        },
    });


    L.NewPolygonControl = L.Control.extend({
        options: {
            position: 'topleft',
        },
        onAdd: function(map) {
            let container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
            let link = L.DomUtil.create('a', '', container);
            link.href = '#';
            link.title = 'Create a new polygon';
            link.innerHTML = '▱';
            L.DomEvent.on(link, 'click', L.DomEvent.stop)
                .on(link, 'click', function() {
                    map.editTools.startPolygon();
                });
            container.style.display = 'block';
            return container;
            },
    });

    L.AddPolygonShapeControl = L.Control.extend({
        options: {
            position: 'topleft',
        },
        onAdd: function(map) {
            let container = L.DomUtil.create('div', 'leaflet-control leaflet-bar');
            let link = L.DomUtil.create('a', '', container);
            link.href = '#';
            link.title = 'Create a new shape for this polygon';
            link.innerHTML = '▱▱';
            L.DomEvent.on(link, 'click', L.DomEvent.stop)
                .on(link, 'click', function() {
                    if (!editingLayer) return;
                    map.editTools.stopDrawing();
                    editingLayer.editor.newShape();
                });
            container.style.display = 'none';
            // container.style.display = 'block';
            map.editTools.on('editable:enabled', function(e) {
                container.style.display = 'block';
            });
            map.editTools.on('editable:disable', function(e) {
                container.style.display = 'none';
            });
            return container;
        },
    });

    map.addControl(new L.NewPolygonControl());
    map.addControl(new L.AddPolygonShapeControl());
    let Z = 90;
    let latlng;
    let redoBuffer = [];
    onKeyDown = function(e) {
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

    /**
     * Save the polygon on server, unless DONTSAVE is false (otherwise do nothing)
     *
     * @param {any} e  event
     */
    function savePolygon(e) {
        /* eslint-disable max-len */
        if (!DONTSAVE) {
            dataset[img.src] = [];
            map.editTools.featuresLayer.eachLayer(function(layer) {
                data = layer.toGeoJSON();
                if (data.type === 'FeatureCollection') {
                    if (data.features[0].geometry.type === 'MultiPolygon') {
                        let temp = [];
                        temp = [...data.features[0].geometry.coordinates[0], ...data.features[0].geometry.coordinates.slice(1).map((item) => item[0])];
                        data.features[0].geometry.coordinates = temp;
                        data.features[0].geometry.type = 'Polygon';
                    }
                    data = data.features[0];
                }
                if (data.type === 'Feature') {
                    if (data.geometry.type === 'MultiPolygon') {
                        data.geometry.type = 'Polygon';
                        data.geometry.coordinates = [...data.geometry.coordinates.map((item)=>item[0])];
                    }
                }


                // Check if first coordinate is different from undefined. I dont know why, but Leaflet.Editable deleteShapeAt function doesn't delete enterely the polygon...
                if (data.geometry.coordinates[0] !== undefined) {
                    if (data.geometry.coordinates[0][0] !== undefined) {
                        for (let indexGeometry in data.geometry.coordinates) {
                            if ({}.hasOwnProperty.call(data.geometry.coordinates, indexGeometry)) {
                                for (let indexPoint in data.geometry.coordinates[indexGeometry]) {
                                    if ({}.hasOwnProperty.call(data.geometry.coordinates[indexGeometry], indexPoint)) {
                                        let [x, y] = data.geometry.coordinates[indexGeometry][indexPoint];
                                        let xInImage = Math.round(x / scaling);
                                        let yInImage = Math.round(y / scaling);
                                        data.geometry.coordinates[indexGeometry][indexPoint] = [xInImage, height - yInImage];
                                    }
                                }
                            }
                        }
                        dataset[img.src].push(data);
                    }
                }
            });

            window.sessionStorage.setItem('dataset', JSON.stringify(dataset));

            let urlMask = `/api/v1/masks/${imagesList[indexImage]}`;
            $.ajax({
                url: urlMask,
                type: 'POST',
                data: JSON.stringify(dataset[img.src]),
                contentType: 'application/json',
            }).done(function() {
                window.sessionStorage.removeItem('editing_polygon');
                socket.emit('send_a_new_json', imagesList[indexImage]);
            }).fail(function(msg) {
                console.log('Problème de synchronisation...');
            });
        }
    /* eslint-enable max-len */
    }

    map.on('editable:drawing:end', function(e) {
        redoBuffer = [];

        let layer = e.layer;
        let feature = layer.feature = layer.feature || {}; // Initialize feature

        feature.type = feature.type || 'Feature'; // Initialize feature.type
        let props = feature.properties = feature.properties || {}; // Initialize feature.properties
        props.category = currentClass;
        props.class_css = currentClassCss;

        let selection = document.querySelector('.' + currentClassCss);
        let style = getComputedStyle(selection);
        layer.setStyle({fillColor: style.color});

        savePolygon(e);
    });

    map.on('editable:vertex:dragend', function(e) {
        savePolygon(e);
    });

    map.on('editable:dragend', function(e) {
        savePolygon(e);
    });

    map.on('editable:vertex:deleted', function(e) {
        savePolygon(e);
    });

    map.on('editable:shape:deleted', function(e) {
        savePolygon(e);
    });

    window.onkeydown = function(event) {
        // ?
        if (event.keyCode === 188 ) {
            $('#help').modal('show');
        }

        // ESC
        if (event.keyCode === 27) {
            if (map.editTools._drawingEditor) map.editTools.stopDrawing();
            map.editTools.featuresLayer.getLayers().forEach(function(l) {
                if (l instanceof L.LayerGroup) {
                    l.getLayers().forEach(function(layer) {
                        if (layer.editEnabled()) {
                            layer.toggleEdit();
                        }
                    });
                } else {
                    if (l.editEnabled()) {
                        l.toggleEdit();
                    }
                }
            });
        }

        // & ou 1 ! (clavier canadien)
        if (event.keyCode === 49) {
            // If not editing do nothing
            // otherwise, add new shape to editingLayer
            if (!editingLayer) return;
            map.editTools.stopDrawing();
            editingLayer.editor.newShape();
        }

        // ² ou | # ~ (clavier canadien)
        if (event.keyCode === 222 || event.keyCode === 192) {
            map.editTools.featuresLayer.getLayers().forEach(function(l) {
                if (l instanceof L.LayerGroup) {
                    l.getLayers().forEach(function(layer) {
                        if (layer.editEnabled()) {
                            layer.toggleEdit();
                        }
                    });
                } else {
                    if (l.editEnabled()) {
                        l.toggleEdit();
                    }
                }
            });
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
            document.getElementById('next').click();
        }

        // F1
        if (event.keyCode === 112) {
            map.editTools.stopDrawing();
            document.getElementById('previous').click();
            event.preventDefault();
        }
    };

    let deleteShape = function(e) {
        if ((e.originalEvent.ctrlKey || e.originalEvent.metaKey) && this.editEnabled()) {
            this.editor.deleteShapeAt(e.latlng);
        }
    };

    map.on('layeradd', function(e) {
        if (e.layer instanceof L.Path) {
            e.layer.on('click', L.DomEvent.stop).on('click', deleteShape, e.layer);

            e.layer.on('dblclick', L.DomEvent.stop).on('dblclick', function() {
                // Disable edition for each featuresLayer
                map.editTools.featuresLayer.getLayers().forEach(function(l) {
                    if (l instanceof L.LayerGroup) {
                        l.getLayers().forEach(function(layer) {
                            if (layer.editEnabled() && layer !== e.layer) {
                                DONTSAVE = true;
                                layer.toggleEdit();
                                DONTSAVE = false;
                            }
                        });
                    } else {
                        if (l.editEnabled() && l !== e.layer) {
                            DONTSAVE = true;
                            l.toggleEdit();
                            DONTSAVE = false;
                        }
                    }
                });
                editingLayer = undefined;

                // Activate our featureLayer
                DONTSAVE = true;
                e.layer.toggleEdit();
                DONTSAVE = false;

                if (e.layer.editEnabled()) {
                    let category = e.layer.feature.properties.category;
                    let instance = $treeview.jstree(true);
                    instance.deselect_all(true);
                    let branchCont = instance._model.data;
                    for (let branchKey in branchCont) {
                        if ({}.hasOwnProperty.call(branchCont, branchKey)) {
                            let branch = branchCont[branchKey];
                            if (branch.text && branch.text === category) {
                                instance.select_node(branchKey);
                                break;
                            }
                        }
                    }
                    editingLayer = e.layer;
                    map.editTools.fire('editable:enabled');
                } else {
                    editingLayer = undefined;
                }
            });
        }
    });

    let displayPolygons = function() {
        let urlMask = `/api/v1/masks/${imagesList[indexImage]}`;
        $.ajax({
            url: urlMask,
            type: 'GET',
            success: function(data) {
                /* eslint-disable max-len */
                DONTSAVE = true;
                map.editTools.featuresLayer.clearLayers();
                map.editTools.editLayer.clearLayers();
                DONTSAVE = false;
                if (window.sessionStorage['dataset'] === undefined) {
                    dataset = {};
                } else {
                    dataset = JSON.parse(window.sessionStorage['dataset']);
                }

                if (dataset[img.src] === undefined) {
                    dataset[img.src] = [];
                }
                dataset[img.src] = JSON.parse(data);
                for (let indexGeojsonFeature in dataset[img.src]) {
                    if ({}.hasOwnProperty.call(dataset[img.src], indexGeojsonFeature)) {
                        geojsonFeature = dataset[img.src][indexGeojsonFeature];
                        for (let indexGeometry in geojsonFeature.geometry.coordinates) {
                            if ({}.hasOwnProperty.call(geojsonFeature.geometry.coordinates, indexGeometry)) {
                                for (let indexPoint in geojsonFeature.geometry.coordinates[indexGeometry]) {
                                    if ({}.hasOwnProperty.call(geojsonFeature.geometry.coordinates[indexGeometry], indexPoint)) {
                                        let [x, y] = geojsonFeature.geometry.coordinates[indexGeometry][indexPoint];
                                        let xInGeo = x * scaling;
                                        let yInGeo = (height - y) * scaling;
                                        geojsonFeature.geometry.coordinates[indexGeometry][indexPoint] = [xInGeo, yInGeo];
                                    }
                                }
                            }
                        }

                        L.geoJSON(geojsonFeature).addTo(map.editTools.featuresLayer).getLayers().forEach(function(l) {
                            DONTSAVE = true;
                            l.enableEdit();
                            l.toggleEdit();
                            DONTSAVE = false;
                            let feature = l.feature = l.feature || {}; // Initialize feature
                            feature.type = feature.type || 'Feature'; // Initialize feature.type
                            let props = feature.properties = feature.properties || {}; // Initialize feature.properties
                            props.class_css = props.class_css = props.class_css || 'annotation_class_default';

                            let selection = document.querySelector('.' + props.class_css);
                            if (selection === null) {
                                console.info('css class is missing : ' + props.class_css);
                                l.setStyle({opacity: 1, fillOpacity: 1, fillColor: '#000000'});
                            } else {
                                let style = getComputedStyle(selection);
                                l.setStyle({fillColor: style.color});
                            }
                        });
                    }
                }
                if (window.sessionStorage.getItem('editing_polygon')) {
                    let geojsonFeature = JSON.parse(window.sessionStorage.getItem('editing_polygon'));
                    console.log('reloading current editing polygon');
                    console.log(geojsonFeature);
                    console.log(`DONTSAVE : ${DONTSAVE}`);
                    L.geoJSON(geojsonFeature).addTo(map.editTools.featuresLayer).getLayers().forEach(function(l) {
                        DONTSAVE=true;
                        l.enableEdit();
                        DONTSAVE=false;

                        let feature = l.feature = l.feature || {}; // Initialize feature
                        feature.type = feature.type || 'Feature'; // Initialize feature.type
                        let props = feature.properties = feature.properties || {}; // Initialize feature.properties
                        props.class_css = props.class_css = props.class_css || 'annotation_class_default';

                        let selection = document.querySelector('.' + props.class_css);
                        if (selection === null) {
                            console.info('css class is missing : ' + props.class_css);
                            l.setStyle({opacity: 1, fillOpacity: 1, fillColor: '#000000'});
                        } else {
                            let style = getComputedStyle(selection);
                            l.setStyle({fillColor: style.color});
                        }
                    });
                }
                console.log(`found : ${dataset[img.src].length} existing polygon for this image ${img.src}`);
                /* eslint-enable max-len */
            },
        });
    };

    let socket = io();
    socket.on('connect', function() {
        img.onload = function() {
            searchbar.current = searchbar.options.find((item) => item.label === imagesList[indexImage]);
            socket.emit('room-join', imagesList[indexImage]);

            width = this.width;
            height = this.height;

            if (this.height > this.width) {
                newHeight = parseFloat('0.' + height);
                scaling = newHeight / height;
                newWidth = width * scaling;
            } else {
                newWidth = parseFloat('0.' + width);
                scaling = newWidth / width;
                newHeight = height * scaling;
            }

            let imageBounds = [[0.0, 0.0], [newHeight, newWidth]];
            image = L.imageOverlay(this.src, imageBounds).addTo(map);
            map.setView(new L.LatLng(newHeight / 2, newWidth / 2));


            let bounds = L.latLngBounds([0.0, 0.0], [newHeight, newWidth]);

            map.setMaxBounds(bounds);
            map.fitBounds(bounds);
            map.panInsideBounds(bounds, {animate: false});
            map.dragging.enable();
            map.on('drag', function() {
                map.panInsideBounds(bounds, {animate: false});
            });

            map.editTools.featuresLayer.clearLayers();
            map.editTools.editLayer.clearLayers();

            displayPolygons();
        };

        socket.on('should_refresh_json', function(data) {
            map.editTools.featuresLayer.getLayers().forEach(function(l) {
                if (l instanceof L.LayerGroup) {
                    l.getLayers().forEach(function(layer) {
                        if (layer.editEnabled()) {
                            if (layer.toGeoJSON().geometry.coordinates[0].length > 3) {
                                window.sessionStorage.setItem('editing_polygon', JSON.stringify(layer.toGeoJSON()));
                            }
                        }
                    });
                } else {
                    if (l.editEnabled()) {
                        if (l.toGeoJSON().geometry.coordinates[0].length > 3) {
                            window.sessionStorage.setItem('editing_polygon', JSON.stringify(l.toGeoJSON()));
                        }
                    }
                }
            });
            displayPolygons();
        });
    });


    document.getElementById('next').addEventListener('click', function(e) {
        indexImage = indexImage + 1;
        if (indexImage >= imagesList.length) {
            indexImage = 0;
        }
        searchbar.change_image(searchbar.options.find((item) => item.label === imagesList[indexImage]));
    });

    document.getElementById('previous').addEventListener('click', function(e) {
        indexImage = indexImage - 1;
        if (indexImage < 0) {
            indexImage = imagesList.length - 1;
        }
        searchbar.change_image(searchbar.options.find((item) => item.label === imagesList[indexImage]));
    });

    document.getElementById('random').addEventListener('click', function(e) {
        indexImage = Math.floor(Math.random() * imagesList.length);
        searchbar.change_image(searchbar.options.find((item) => item.label === imagesList[indexImage]));
    });

    document.getElementById('help_btn').addEventListener('click', function(e) {
        $('#help').modal('show');
    });

    let $treeview = $('#tree');
    $.ajax({
        url: '/api/v1/categories',
        type: 'GET',
        success: function(data) {
            if (typeof data !== Array) {
                data = JSON.parse(data);
            }
            $treeview
            .jstree({
                'core': {
                    'check_callback': true,
                    'data': data,
                    'multiple': false,
                },
                'types': {
                    'default': {
                        'icon': 'fas fa-check',
                    },
                },
                'plugins': ['dnd', 'state', 'types'],
            });
            $treeview.on('ready.jstree', function() {
                $treeview.jstree('open_all');
                currentClass = $treeview.jstree('get_selected', true)[0].text;
                currentClassCss = $treeview.jstree('get_selected', true)[0].li_attr.class;
                $('#selected').text(currentClass);
                $treeview.on('changed.jstree', function(e, data) {
                    currentClass = $treeview.jstree('get_selected', true)[0].text;
                    currentClassCss = $treeview.jstree('get_selected', true)[0].li_attr.class;
                    $('#selected').text(currentClass);

                    if (editingLayer) {
                        let layer = editingLayer;
                        let feature = layer.feature = layer.feature || {}; // Initialize feature

                        feature.type = feature.type || 'Feature'; // Initialize feature.type
                        let props = feature.properties = feature.properties || {}; // Initialize feature.properties
                        props.category = currentClass;
                        props.class_css = currentClassCss;

                        // TODO(tofull) analyse why I used this queryselector...
                        let selection = document.querySelector('.' + currentClassCss);
                        let style = getComputedStyle(selection);
                        layer.setStyle({fillColor: style.color});
                        savePolygon(e);
                    }
                });
                $.ajax({
                    url: '/api/v1/images',
                    type: 'GET',
                    success: function(data) {
                        imagesList = JSON.parse(data);
                        searchbar.options = imagesList.map((x, id) => {
                            return {id: id, label: x};
                        });
                        let searchParams = new URLSearchParams(window.location.search.substring(1));
                        let tempIndex = -1;
                        if (searchParams.has('image')) {
                            tempIndex = searchbar.options.findIndex((item) => item.label === searchParams.get('image'));
                        }
                        if (tempIndex !== -1) {
                            indexImage = tempIndex;
                        } else {
                            indexImage = parseInt(window.sessionStorage['index_image']) || 0;
                        }
                        searchbar.change_image(searchbar.options.find((item) => item.label === imagesList[indexImage]));
                    },
                });
            }).bind('loaded.jstree', function(event, data) {
                $('#tree li a').addTouch();
            });
        },
    });


    document.getElementById('expand_all').addEventListener('click', function(e) {
        $treeview.jstree('open_all');
    });
})();
