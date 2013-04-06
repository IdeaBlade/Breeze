/* main: startup script creates the 'todo' module and its Angular directives */
app = {}; // establish application global namespace

app.todoMain = angular.module('TodoMain', [])
    .directive('onFocus', function () {
        return {
            restrict: 'A',
            link: function (scope, elm, attrs) {
                elm.bind('focus', function () {
                    scope.$apply(attrs.onFocus);
                });
            }
        };
    })
    .directive('onBlur', function () {
        return {
            restrict: 'A',
            link: function (scope, elm, attrs) {
                elm.bind('blur', function () {
                    scope.$apply(attrs.onBlur);
                });
            }
        };
    })
    .directive('focusWhen', function () {
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
