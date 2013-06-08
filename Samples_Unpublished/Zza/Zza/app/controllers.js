'use strict';

/* Controllers */
app.controller('RouteCtrl', function ($scope, $route) {
    $scope.$route = $route;

    // we show links only for routes that have a display name
    var links = jQuery.grep(app.routes, function (item, i) {
            return (item.name);
        });
    $scope.links = links;
});


app.controller('HomeCtrl', [function () {

}]);

app.controller('CartCtrl', ['$scope', function ($scope) {


}]);

app.controller('OrderCtrl', function ($scope, $routeParams) {

    // tag comes from nav url; map tags to view urls
    var tagmap = {
        'drinks': 'App/views/orderdrinks.html',
        'pizza': 'App/views/orderpizza.html',
        'pasta': 'App/views/orderpasta.html'
    };
    var tag = $routeParams.tag || 'pizza';
   
    $scope.tag = tag;   // tag is used in menu
    $scope.view = tagmap[tag];  // view is used in ng-include

});
