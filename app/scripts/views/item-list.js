poplight.Views.itemListView = Backbone.View.extend({
    id: 'product-list',
    tagName: 'ul',

    add: function(item) {
        this.$el.append(item.render().$el);
    },
});
