(function () {
    'use strict';
    angular.module('app')

    .directive('appVersion', ['config', function(config) {
        return function(scope, elm) {
            elm.text(config.version);
        };
    }])

    // Prefix product images with the image basepath
    //  Usage:
    //  <img class="img-polaroid" data-product-src="{{product.image}}" title="{{product.name}}"/>
    .directive('productSrc', ['config', function (config) {
        var productImageBasePath = config.productImageBasePath;
        var productUnknownImage = config.productUnknownImage;
        
        return {
            priority: 99, // it needs to run after the attributes are interpolated
            link: function (scope, element, attrs) {
                attrs.$observe('productSrc', function (value) {
                    value = value ? productImageBasePath + value : productUnknownImage;
                    attrs.$set('src', value);
                });
            }
        };

    }]);

})();