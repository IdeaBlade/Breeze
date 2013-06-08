'use strict';

/* Controllers */
app.controller('RouteCtrl', function ($scope, $route) {
    $scope.current = $route.current;

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

    // tag comes from nav url; get the current route
    var tag = $routeParams.tag || 'pizza';
    var route = jQuery.grep(app.orderroutes, function (item, i) {
        return (item.tag == tag);
    });

    $scope.tag = tag;   // flags active link
    $scope.links = app.orderroutes;
    $scope.view = route[0].templateUrl; // view is used in ng-include

});
