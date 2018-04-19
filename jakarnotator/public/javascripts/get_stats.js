console.log("get_stats loaded");

var images_list;

function fn(){
    new Vue({
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
            values: images_list
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
        },
        methods: {
            addItem: function () {
                var self = this;
                var item = {
                    "id": this.values.length + 1,
                    "name": "name " + (this.values.length + 1),
                    "number_masks": 0,
                };
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
}

$.ajax({
    url: "/images",
    type: 'GET',
    success: function (data) {
        images_list = JSON.parse(data);
        var c = 0;
        images_list.forEach(function (image, index) {
            images_list[index] = {name: image}
            $.ajax({
                url: `/masks/stats/${image}`,
                type: 'GET',
                success: function (data) {
                    images_list[index].id = index
                    images_list[index].number_masks = parseInt(data);
                    c++
                    if (c == images_list.length) {
                        fn();
                    }
                }
            })
        })
    }
})
