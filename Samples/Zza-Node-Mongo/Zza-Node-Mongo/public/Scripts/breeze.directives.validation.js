/* 
 * Breeze Angular directives
 *
 *  v.1.3
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
    *   Required indicator applied if the bound data property
    *   has a required validator. A required validator is a validator 
    *   which has an .isRequired == true property (or is named 'required')
    *   See private `getRequiredPropertiesForEntityType`
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
            // Use only features defined in Angular's jqLite
            var decorator = angular.element('<span class="z-decorator"></span>');
            element.after(decorator);
            var domEl = element[0]; // unwrap 'jquery' element to get DOM element
            var errEl = null; // the (not yet existing) error message element 
            var valTemplate = config.zValidateTemplate;
            
            var info = getInfo(scope, attrs); // get validation info for bound entity property
            
            scope.$watch(info.getValErrs, valErrsChanged);

            function valErrsChanged(newValue) {
                
                setRequired(decorator, info); 
                
                // HTML5 custom validity
                // http://dev.w3.org/html5/spec-preview/constraints.html#the-constraint-validation-api
                if (domEl.setCustomValidity) {
                    domEl.setCustomValidity(newValue);
                    //return; /* only works in HTML 5. Maybe should throw instead. */
                }

                // Add/remove the error message HTML (errEl) and styling 
                if (newValue) {
                    var html = valTemplate.replace(/%error%/, newValue);
                    if (errEl) {
                        errEl.replaceWith(html);
                    } else {
                        errEl = angular.element(html);
                        decorator.append(errEl);
                    }
                } else if (errEl) {
                    errEl.remove();
                    errEl = null;
                }
            }
        }

        // Get info about the data bound entity property
        function getInfo(scope, attrs) {
            var entityPath = null, propertyPath = null;
            var ngModel = attrs.ngModel;
            var valPath = attrs.zValidate;

            if (!ngModel && !valPath) { // need some path info from attrs
                return { getValErrs: function () { return ''; } }; //noop                
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
                return function () {
                    var aspect = getAspect();
                    if (aspect) {
                        var errs = aspect.getValidationErrors(propertyPath);
                        if (errs.length) {
                            return errs
                                // concatenate all errors into a single string
                                .map(function (e) { return e.errorMessage; })
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
        
        // TODO: Mover required property getting and setting to a separate module
        // because is not angular specific and could be used 
        // in other presentation frameworks such as a custom Knockout binding
        
        // return a hash of property names of properties that are required.
        // Creates that hash lazily and adds it to the  
        // entityType's metadata for easier access by this directive 
        function getRequiredPropertiesForEntityType(type) {
            if (type.custom && type.custom.required) {
                return type.custom.required;
            }

            // Don't yet know the required properties for this type
            // Find out now
            if (!type.custom) {
                type.custom = {};
            }
            var required = {};
            type.custom.required = required;
            var props = type.getProperties();
            props.forEach(function(prop) {
                var vals = prop.validators;
                for (var i = vals.length; i--;) {
                    var val = vals[i];
                    // Todo: add the 'isRequired' property to breeze.Validator.required validator
                    if (val.isRequired || val.name === 'required') {
                        required[prop.name] = true;
                        break;
                    }
                }
            });
            return required;
        }

        function setRequired(element, info) {
            // Set the required indicator once ... when an entity first arrives
            // at which point we can determine whether the data property is required
            // Note: can't detect until second call to directive's link function
            if (element.hasSetRequired) { return; } // already set

            var entityType = info.getType();
            if (!entityType) { return; } // no entity, type is unknown, quit

            var requiredProperties = getRequiredPropertiesForEntityType(entityType);

            // if the data property is required, add the appropriate styling and element
            if (requiredProperties[info.propertyPath]) {
                var reqHtml = config.zRequiredTemplate;
                var reqEl = angular.element(reqHtml);
                element.append(reqEl);
            }

            element.hasSetRequired = true;  // don't set again
        }
    }

    /* Configure app to use zValidate
    *
    *  Configure breeze directive templates
    *  
    *  zValidateTemplate: template for display of validation errors
    *  zRequiredTemplate: template for display of required property indicator
    *
    *  Template configuarion usage:
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
            '<span class="icon-asterisk-invalid z-required" title="Required">*</span>';

        this.$get = function() {
            return {
                zValidateTemplate: this.zValidateTemplate,
                zRequiredTemplate: this.zRequiredTemplate
            };
        };
    });

})();