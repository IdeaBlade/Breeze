/* 
 * Breeze Angular directives
 *
 *  
 *  Usage:
 *     // Make it a dependency of your app module:
 *     var app = angular.module('app', ['breeze.directives']); 
 *
 * Copyright 2013 IdeaBlade, Inc.  All Rights Reserved.  
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 * Author: Ward Bell
 */

(function () {
    'use strict';

    var module = angular.module('breeze.directives', []);

    /* Configure the breeze directives
    *  
    *  zValidateTemplate: template for display of validation errors
    * 
    *  Usage:
    *      Either during the app's Angular config phase ...
    *      app.config(['zDirectivesConfigProvider', function(cfg) {
    *          cfg.zValidateTemplate =
    *              '<span class="invalid"><i class="icon-warning-sign"></i>' +
    *              'Oh No!!! %error%</span>';
    *      }]);
    *      
    *      // ... or during the app's Angular run phase:
    *      app.run(['zDirectivesConfig', function(cfg) {
    *          cfg.zValidateTemplate =
    *              '<span class="invalid"><i class="icon-warning-sign"></i>' +
    *              'So sad!!! %error%</span>';
    *      }]);
    */
    module.provider('zDirectivesConfig', function() {
        // The default zValidate template for display of validation errors assumes bootstrap.js
        this.zValidateTemplate =
            '<span class="invalid"><i class="icon-warning-sign"></i>%error%</span>';

        this.$get = function() {
            return {
                zValidateTemplate: this.zValidateTemplate
            };
        };
    });
    
    module.directive('zValidate', ['zDirectivesConfig', zValidate]);
    
    function zValidate(config) {
        //Usage:
        //    <input data-ng-model='vm.session.firstName' data-z-validate />
        //    <input data-ng-model='vm.session.track' data-z-validate='trackId' />
        //  within repeater where scope is an entity
        //    <input data-ng-model='title' data-z-validate />
        var directive = {
            link: link,
            restrict: 'A'
        };
        return directive;

        function link(scope, element, attrs) {
            var info = getInfo(scope, attrs);
            scope.$watch(info.getValErrs, valErrsChanged);
           
            function valErrsChanged(newValue) {
                // HTML5 custom validity
                // http://dev.w3.org/html5/spec-preview/constraints.html#the-constraint-validation-api
                var el = element[0]; // unwrap 'jQuery' element
                if (el.setCustomValidity) {
                    el.setCustomValidity(newValue);
                    //return; /* only works in HTML 5 */
                }
                
                // Add/remove the error message HTML and styling
                // errEl is the sibling of this element if it has the 'invalid' class
                var errEl = element.next();
                errEl = errEl.hasClass('invalid') ? errEl : null;

                if (newValue) {
                    var html = config.zValidateTemplate.replace(/%error%/, newValue);
                    if (errEl) {
                        errEl.replaceWith(html);
                    } else {
                        errEl = angular.element(html);
                        element.after(errEl);
                    }
                } else if (errEl) {
                    errEl.remove();
                } 
            }
        }

        function getInfo(scope, attrs) {
            var entityPath = null, propertyPath = null;
            var ngModel = attrs.ngModel;
            var valPath = attrs.zValidate;

            if (!ngModel && !valPath) { // need some path info from attrs
                return { getValErrs: function() { return ''; } }; //noop                
            }
            
            getEntityAndPropertyPaths();

            var getAspect = entityPath ? aspectFromPath : aspectFromEntity;
            var result = {
                entityPath: entityPath,
                propertyPath: propertyPath,
                getAspect: getAspect,
                getValErrs: createGetValErrs()
            };
            
            return result;
            
            function getEntityAndPropertyPaths() {
                var paths;
                if (ngModel) {
                    paths = ngModel.split('.'); // 'vm.order.delivery'
                    propertyPath = paths.pop(); // property is after last '.' 
                    entityPath = paths.join('.'); // path to entity is before last '.'
                    // propertyPath should be 'delivery'
                    // entityPath should be 'vm.order'
                }
                // valPath can override either path; 
                // uses ',' as {entity, path} separator
                if (valPath) {
                    // examples:
                    //   'vm.order,delivery'       // entity and property
                    //   'productId'               // property only
                    //   'vm.order,address.street' // entity w/ complex prop
                    paths = valPath.split(',');
                    var pPath = paths.pop();
                    var ePath = paths.pop();
                    if (pPath) { propertyPath = pPath.trim(); }
                    if (ePath) { entityPath = ePath.trim(); }
                }
            }

            function createGetValErrs() {
                return function() {
                    var aspect = getAspect();
                    if (aspect) {
                        var errs = aspect.getValidationErrors(propertyPath);
                        if (errs.length) {
                            return errs
                                // concatenate all errors into a single string
                                .map(function(e) { return e.errorMessage; })
                                .join('; ');
                        }
                    }
                    return '';
                };
            }

            function aspectFromPath() {
                try { return scope.$eval(entityPath)['entityAspect']; }
                catch (_) { return undefined; }
            }

            function aspectFromEntity() { return scope.entityAspect; }
        }
    }
})();