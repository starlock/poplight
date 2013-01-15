
window.poplight = {
  Models: {},
  Collections: {},
  Views: {},
  Routers: {},
  init: function() {
    var request = new API.Request('marketplace.popular.products', {}, 'GET');
    request.setOnSuccess(function(products) {
        var item, list;
        list = new poplight.Views.itemListView().render();
        _.each(products, function(product) {
            item = new poplight.Views.itemView({
                'product': product
            });
            list.add(item);
        });
        $('#navigation').append(list.$el);
    });
    request.send();
  }
};

$(document).ready(function(){
  poplight.init();
});
