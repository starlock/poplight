poplight.Views.itemView = Backbone.View.extend({
    tagName: 'li',
    className: 'product_item media',

    events: {
        'mouseover': 'onHover',
    },

    generateImage: function() {
        var image_url = this.options.product.images[0].sizes['50'];
        return this.make('img', {
            'src': image_url,
            'alt': this.options.product.title
        });
    },

    render: function() {
        var image = this.generateImage();
        var title = this.make('span', {}, this.options.product.title);

        this.$el.append(image);
        this.$el.append(title);
        return this;
    },

    onHover: function() {
        console.log('Hovering');
    },
});
