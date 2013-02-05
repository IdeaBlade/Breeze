/* main: startup script creates the 'todo' module and its Angular directives */

// 'todo' is the one Angular (Ng) module in this app
var todo = angular.module('todo', []);

// Add global "services" (like breeze) to the Ng injector
// Learn about Angular dependency injection in this video
// http://www.youtube.com/watch?feature=player_embedded&v=1CpiB3Wk25U#t=2253s
todo.value('breeze', window.breeze); 
todo.value('toastr', window.toastr);

// Add Ng directives
todo.directive('onFocus', function () {
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
