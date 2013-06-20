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

// Directive for adding Breeze validation messages next to input controls.  For example,
// <breezeinput label="Company Name" ng-model="customer.CompanyName" type="text" formid="xyz123" ></breezeinput>
//   type defaults to "text"
//   formid defaults to an auto-generated id.
//   label and ng-model are required.  The ng-model value must be found on the scope.
// Markup and styles are for bootstrap's form-horizontal: http://twitter.github.io/bootstrap/base-css.html#forms
app.directive('breezeinput', function () {
    var uid = 0;
    return {
        restrict: 'E',
        compile: function (element, attrs) {

            var ngModel = attrs.ngModel;
            if (!ngModel) return; // ngModel is required
            var arr = ngModel.split('.');
            var propName = arr.pop();
            var entityPath = arr.join('.');

            // we store the error messages in a new property on the entityAspect, e.g. customer.entityAspect.CompanyNameErrors
            var errorProp = propName + 'Errors';
            var errorPath = entityPath + '.entityAspect.' + errorProp;

            var type = attrs.type || 'text';
            var id = attrs.formid || 'bz-' + attrs.ngModel + uid++;

            var required = attrs.hasOwnProperty('required') ? "required='required'" : "";
            var htmlText = '<div class="control-group">' +
                '<label class="control-label" for="' + id + '">' + attrs.label + '</label>' +
                    '<div class="controls">' +
                    '<input type="' + type + '" id="' + id + '" name="' + id + '" ' + required + ' ng-model="' + ngModel + '">' +
                    '<span class="help-inline">{{' + errorPath + '}}</span>' +
                    '</div>' +
                '</div>';
            element.replaceWith(htmlText);

            var linker = function (scope, element, attrs, controller) {

                // watch the expression, and update the UI on change.
                scope.$watch(ngModel, function (value) {
                    var entity = scope.$eval(entityPath);
                    if (!entity) return;
                    var aspect = entity.entityAspect; 
                    var errors = aspect.getValidationErrors(propName);
                    if (errors.length) {
                        element.addClass('error');
                        var messages = errors.map(function (el) { return el.errorMessage; }).join("; ");  // convert to string
                        aspect[errorProp] = messages;
                    } else {
                        element.removeClass('error');
                        aspect[errorProp] = null;
                    }
                });

            };
            return linker;
        },

    }
});


