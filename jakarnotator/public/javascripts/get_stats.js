var app = new Vue({
    el: '#app',
    components: {
        VueBootstrapTable: VueBootstrapTable
    },
    data: {
        logging: [],
        showFilter: true,
        showPicker: true,
        paginated: true,
        multiColumnSortable: true,
        columns: [
            {
                title: "id",
                visible: false,
                editable: false,
            },
            {
                title: "Name",
                name: "name",
                visible: true,
                editable: false,
            },
            {
                title: "Number of masks",
                name: "number_masks",
                visible: true,
                editable: false,
            }
        ],
        values: []
    },
    created: function () {
        var self = this;
        this.$on('cellDataModifiedEvent',
            function (originalValue, newValue, columnTitle, entry) {
                self.logging.push("cellDataModifiedEvent - Original Value : " + originalValue +
                    " | New Value : " + newValue +
                    " | Column : " + columnTitle +
                    " | Complete Entry : " + entry);
            }
        );
        this.$on('ajaxLoadedEvent',
            function (data) {
                this.logging.push("ajaxLoadedEvent - data : " + data);
            }
        );
        this.$on('ajaxLoadingError',
            function (error) {
                this.logging.push("ajaxLoadingError - error : " + error);
            }
        );

        fetch('/images', { method: 'GET' })
            .then(response => response.json())
            .then(list_image_json => JSON.parse(list_image_json))
            .then(list_images => {
                list_images.map((image_name, index) => {
                    fetch(`/masks/stats/${image_name}`, { method: 'GET' })
                        .then(response => response.json())
                        .then(data => {
                            self.addItem({ name: image_name, number_masks: parseInt(data.number_masks) })
                        })
                })
            });

    },
    methods: {
        addItem: function (item) {
            item.id = this.values.length + 1
            this.values.push(item);
        },
        toggleFilter: function () {
            this.showFilter = !this.showFilter;
        },
        togglePicker: function () {
            this.showPicker = !this.showPicker;
        },
        togglePagination: function () {
            this.paginated = !this.paginated;
        }
    },
});



var app_mask = new Vue({
    el: '#app_mask',
    components: {
        VueBootstrapTable: VueBootstrapTable
    },
    data: {
        logging: [],
        showFilter: true,
        showPicker: true,
        paginated: true,
        multiColumnSortable: true,
        columns: [
            {
                title: "id",
                visible: false,
                editable: false,
            },
            {
                title: "Catégorie",
                name: "name",
                visible: true,
                editable: false,
            },
            {
                title: "Number of masks",
                name: "number_masks",
                visible: true,
                editable: false,
            }
        ],
        values: []
    },
    created: function () {
        var self = this;
        this.$on('cellDataModifiedEvent',
            function (originalValue, newValue, columnTitle, entry) {
                self.logging.push("cellDataModifiedEvent - Original Value : " + originalValue +
                    " | New Value : " + newValue +
                    " | Column : " + columnTitle +
                    " | Complete Entry : " + entry);
            }
        );
        this.$on('ajaxLoadedEvent',
            function (data) {
                this.logging.push("ajaxLoadedEvent - data : " + data);
            }
        );
        this.$on('ajaxLoadingError',
            function (error) {
                this.logging.push("ajaxLoadingError - error : " + error);
            }
        );

        fetch(`/process/test`, { method: 'GET' })
            .then(response => response.json())
            .then(data => {
                Object.keys(data).forEach(function (key) {
                    category_name = key;
                    number_masks = data[key];
                    self.addItem({ name: category_name, number_masks: parseInt(number_masks) });
                })
            })
    },
    methods: {
        addItem: function (item) {
            item.id = this.values.length + 1
            this.values.push(item);
        },
        toggleFilter: function () {
            this.showFilter = !this.showFilter;
        },
        togglePicker: function () {
            this.showPicker = !this.showPicker;
        },
        togglePagination: function () {
            this.paginated = !this.paginated;
        }
    },
});
