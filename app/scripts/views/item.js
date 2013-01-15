poplight.Views.itemView = Backbone.View.extend({
    tagName: 'li',
    className: 'product_item media',

    events: {
        'mouseover': 'onHover',
    },

    getImageURL: function(size) {
        size = size + ''; // Stringify
        return this.options.product.images[0].sizes[size];
    },

    generateImage: function(size) {
        var image_url = this.getImageURL(size);
        return this.make('img', {
            'src': image_url,
            'alt': this.options.product.title,
            'height': 50
        });
    },

    render: function() {
        var image = this.generateImage(50);
        var title = this.make('span', {}, this.options.product.title);
				this.$el.css('background', 'url("' + this.options.product.images[0].sizes['1000'] + '") 450px 400px')
        this.$el.append(title);
        return this;
    },

    onHover: function() {
        this.trigger('hovered', this);
    }
});
