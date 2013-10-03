/* 
 * Breeze Angular directives
 *
 *  v.1.0
 *
 *  Usage:
 *     Make this module a dependency of your app module:
 *       var app = angular.module('app', ['breeze.directives']); 
 *
 *     Include breeze.directives.css for default styling
 *       <link href="content/breeze.directives.css" rel="stylesheet" />
 *
 * Copyright 2013 IdeaBlade, Inc.  All Rights Reserved.  
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 * Author: Ward Bell
 */

(function () {
    'use strict';

    var module = angular.module('breeze.directives', []);

    /* Breeze Validation directive
    *  
    *  Displays the model validation errors for an entity property
    *  and adds required indicator if the bound property is required
    *
    *  Usage:
    *   When scope is a viewmodel (vm):
    *     <input data-ng-model='vm.session.firstName' data-z-validate />
    *     <input data-ng-model='vm.session.track' data-z-validate='trackId' />
    *   
    *   When within a repeater where scope is an entity:
    *     <input data-ng-model='title' data-z-validate />
    *
    *   Required indicator applied if the bound data property name
    *   is a member of the "required" hash of the bound entity type.
    *   The "required" hash is not native to the Breeze EntityType;
    *   Typically you add it in your model setup code.
    *   
    *   Learn more at http://www.breezejs.com/breeze-labs/breezedirectivesvalidationjs
    */
    module.directive('zValidate', ['zDirectivesConfig', zValidate]);
    
    function zValidate(config) {
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
                
                setRequired(element, info);

                if (el.setCustomValidity) {
                    el.setCustomValidity(newValue);
                    //return; /* only works in HTML 5. Maybe should throw instead. */
                }
                
                // Add/remove the error message HTML (errEl) and styling 
                // errEl, if it exists, is a sibling of this element with an 'invalid' class
                var errEl = element.nextAll('.invalid')[0];
                
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

        // Get info about the data bound entity property
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
                getType: getType,
                getValErrs: createGetValErrs()
            };
            
            return result;

            function aspectFromPath() {
                try { return scope.$eval(entityPath)['entityAspect']; }
                catch (_) { return undefined; }
            }

            function aspectFromEntity() { return scope.entityAspect; }

            // Create the 'getValErrs' function that will be watched
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
                        return ''; 
                    }
                    // No data bound entity yet. 
                    // Return something other than a string so that 
                    // watch calls `valErrsChanged` when an entity is bound
                    return null;
                };
            }

            function getType() {
                var aspect = getAspect();
                return aspect ? aspect.entity.entityType : null;
            }

            function getEntityAndPropertyPaths() {
                var paths;
                if (ngModel) {
                    // ex: 'vm.order.delivery'
                    // propertyPath should be 'delivery'
                    // entityPath should be 'vm.order'
                    paths = ngModel.split('.');
                    propertyPath = paths.pop(); // property is after last '.' 
                    entityPath = paths.join('.'); // path to entity is before last '.'
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
        }

        function setRequired(element, info) {
            // Set the required indicator once ... when an entity first arrives
            // at which point we can determine whether the data property is required
            var el = element[0];
            if (el.hasSetRequired) { return; } // set it already

            var entityType = info.getType();
            if (!entityType) { return; } // no entity, type is unknown, quit

            // if the data property is required, add the appropriate styling and element
            var requiredProperties = entityType.required;
            if (requiredProperties && requiredProperties[info.propertyPath]) {
                var reqHtml = config.zRequiredTemplate;
                var reqEl = angular.element(reqHtml);
                element.after(reqEl);
            }

            el.hasSetRequired = true;  // don't set again
        }

    }

    /* Configure the breeze directives (optional)
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
        // The default zValidate template for display of validation errors
        this.zValidateTemplate =
            '<span class="invalid">%error%</span>';

        // The default template for indicating required fields.
        // Assumes "icon-asterisk-invalid" from bootstrap css
        this.zRequiredTemplate =
            '<span class="icon-asterisk-invalid" title="Required">*</span>';

        this.$get = function() {
            return {
                zValidateTemplate: this.zValidateTemplate,
                zRequiredTemplate: this.zRequiredTemplate
            };
        };
    });
})();