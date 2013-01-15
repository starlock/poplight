poplight.Views.itemInformationView = Backbone.View.extend({
    id: 'product-information',

    getProduct: function() {
        return this.options.item.options.product;
    },

    generateHeader: function() {
        return this.make('h1', {}, this.getProduct().title);
    },

    generatePrice: function() {
        return this.make('h2', {}, this.getProduct().price + ' EUR');
    },

    render: function() {
        this.$el.append(this.generateHeader());
        this.$el.append(this.generatePrice());
        return this;
    }
});
