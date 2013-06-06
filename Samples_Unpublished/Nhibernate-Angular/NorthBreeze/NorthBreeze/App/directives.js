'use strict';

/* Directives */


app.directive('onFocus', function () {
    return {
        restrict: 'A',
        link: function (scope, elm, attrs) {
            elm.bind('focus', function () {
                scope.$apply(attrs.onFocus);
            });
        }
    };
});

app.directive('onBlur', function () {
    return {
        restrict: 'A',
        link: function (scope, elm, attrs) {
            elm.bind('blur', function () {
                scope.$apply(attrs.onBlur);
            });
        }
    };
});

app.directive('focusWhen', function () {
    return function (scope, elm, attrs) {
        scope.$watch(attrs.focusWhen, function (newVal) {
            if (newVal) {
                setTimeout(function () {
                    elm.focus();
                }, 10);
            }
        });
    };
});

app.directive('appVersion', ['version', function (version) {
    return function (scope, elm, attrs) {
        elm.text(version);
    };
}]);
