poplight.Views.itemListView = Backbone.View.extend({
    id: 'product-list',
    tagName: 'ul',

    add: function(item) {
        item.on('hovered', _.bind(this.onItemHover, this));
        this.$el.append(item.render().$el);
    },

    onItemHover: function(item) {
        this.trigger('item.changed', item);
    }
});
