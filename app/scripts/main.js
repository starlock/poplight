
window.poplight = {
  Models: {},
  Collections: {},
  Views: {},
  Routers: {},
  init: function() {
    var request = new API.Request('marketplace.popular.products', {}, 'GET');
    request.setOnSuccess(function(products) {
			_.each(products, function(product) {
				$('#product_list').append('<li class="product_item media">'
				+ '<img src="' + product.images[0].sizes["50"]  + '" /><span>'
				+ product.title + '</span></li>');
			});
    });
    request.send();
  }
};

$(document).ready(function(){
  poplight.init();
});
