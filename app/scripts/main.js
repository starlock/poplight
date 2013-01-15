
window.poplight = {
  Models: {},
  Collections: {},
  Views: {},
  Routers: {},
  init: function() {
    var request = new API.Request('marketplace.popular.products', {}, 'GET');
    request.setOnSuccess(function(products) {
			console.log(products);
    });
    request.send();
  }
};

$(document).ready(function(){
  poplight.init();
});
