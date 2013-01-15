
window.poplight = {
  Models: {},
  Collections: {},
  Views: {},
  Routers: {},

  onItemChange: function(selectedItem) {
    var image_url = selectedItem.getImageURL(2000);
		$('#background_image').attr('src', image_url).load(function() {
			image_url = 'url(' + image_url + ')';
			$('body').css({
					'background-image': image_url
			});
		});
  },

  init: function() {
    var request = new API.Request('marketplace.popular.products', {}, 'GET');
    request.setOnSuccess(function(products) {
        var item, list;
        var items = [];

        list = new poplight.Views.itemListView().render();
				var windowHeight = $(window).height();
        _.each(products, function(product) {
            item = new poplight.Views.itemView({
                'product': product
            });
            items.push(item);
            list.add(item);
						$(item.el).css('height', (windowHeight / 10) - 10);
        });

        list.on('item.changed', poplight.onItemChange);
        poplight.onItemChange(_.first(items));

        $('#navigation').append(list.$el);
    });
    request.send();
  }
};

$(document).ready(function(){
  poplight.init();
});
