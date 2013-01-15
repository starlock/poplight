
window.poplight = {
  Models: {},
  Collections: {},
  Views: {},
  Routers: {},
  init: function() {
    var request = new API.Request('marketplace.popular.products', {}, 'GET');
    request.setOnSuccess(function(responce) {
        console.log('Got a response from API', response);
        console.log(arguments);
    });
    request.send();
    console.log('Hello from Backbone!');
  }
};

$(document).ready(function(){
  poplight.init();
});
