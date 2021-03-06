( function() {
    new Vue({
        el: '#mask_par_image',
        data: {
            items: [],
            fields: [
                {key: 'image_name', label: 'Name', sortable: true},
                {key: 'number_masks', label: 'Number of masks', sortable: true},
            ],
            currentPage: 1,
            perPage: 5,
            totalRows: 0,
            totalImages: null,
            pageOptions: [5, 10, 15, 25, 50, 100],
            sortBy: 'number_masks',
            sortDesc: true,
            filter: null,
            modalInfo: {title: '', content: ''},
        },
        created: function() {
            totalRows = this.items.length;
            fetch('/api/v1/images', {method: 'GET'})
            .then((response) => response.json())
            .then((listImageJson) => JSON.parse(listImageJson))
            .then((listImages) => {
                this.totalImages = listImages.length;
                listImages.map((imageName, index) => {
                    fetch(`/api/v1/masks/stats/${imageName}`, {method: 'GET'})
                    .then((response) => response.json())
                    .then((data) => {
                        this.addItem({image_name: imageName, number_masks: parseInt(data.number_masks), data: data});
                    });
                });
            });
        },
        computed: {
            sortOptions() {
                // Create an options list from our fields
                return this.fields
                .filter((f) => f.sortable)
                .map((f) => {
                    return {text: f.label, value: f.key};
                });
            },
        },
        methods: {
            addItem: function(item) {
                item.id = this.items.length + 1;
                this.items.push(item);
            },
            info(item, index, button) {
                this.modalInfo.title = `Row index: ${index}`;
                this.modalInfo.content = JSON.stringify(item, null, 2);
                this.$root.$emit('bv::show::modal', 'modalInfo', button);
            },
            resetModal() {
                this.modalInfo.title = '';
                this.modalInfo.content = '';
            },
            onFiltered(filteredItems) {
                // Trigger pagination to update the number of buttons/pages due to filtering
                this.totalRows = filteredItems.length;
                this.currentPage = 1;
            },
        },
    });

    new Vue({
        el: '#mask_par_categories',
        data: {
            items: [],
            fields: [
                {key: 'category_name', label: 'Name', sortable: true},
                {key: 'number_masks', label: 'Number of masks', sortable: true},
            ],
            currentPage: 1,
            perPage: 5,
            totalRows: 0,
            pageOptions: [5, 10, 15, 25, 50, 100],
            sortBy: 'number_masks',
            sortDesc: true,
            filter: null,
            modalInfo: {title: '', content: ''},
        },
        created: function() {
            totalRows = this.items.length;
            fetch(`/api/v1/process/masks_by_categories`, {method: 'GET'})
            .then((response) => response.json())
            .then((data) => {
                Object.keys(data).forEach((key) => {
                    let categoryName = key;
                    let numberMasks = data[key];
                    this.addItem({category_name: categoryName, number_masks: parseInt(numberMasks)});
                });
            });
        },
        computed: {
            sortOptions() {
                // Create an options list from our fields
                return this.fields
                .filter((f) => f.sortable)
                .map((f) => {
                    return {text: f.label, value: f.key};
                });
            },
        },
        methods: {
            total: function() {
                return this.items.map((item) => item.number_masks).reduce(function(total, num) {
                    return total + num;
                }, 0);
            },
            addItem: function(item) {
                item.id = this.items.length + 1;
                this.items.push(item);
            },
            info(item, index, button) {
                this.modalInfo.title = `Row index: ${index}`;
                this.modalInfo.content = JSON.stringify(item, null, 2);
                this.$root.$emit('bv::show::modal', 'modalInfo', button);
            },
            resetModal() {
                this.modalInfo.title = '';
                this.modalInfo.content = '';
            },
            onFiltered(filteredItems) {
                // Trigger pagination to update the number of buttons/pages due to filtering
                this.totalRows = filteredItems.length;
                this.currentPage = 1;
            },
        },
    });
})();
