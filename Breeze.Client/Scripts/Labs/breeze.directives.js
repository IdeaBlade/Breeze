/*
 * Breeze Labs: Breeze Directives for Angular Apps
 *
 *  v.1.3.5
 *
 *  Usage:
 *     Make this module a dependency of your app module:
 *       var app = angular.module('app', ['breeze.directives']);
 *
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 * Author: Ward Bell
 */

(function () {
    'use strict';

    var module = angular.module('breeze.directives', [])
        .directive('zFloat', [zFloat])
        .directive('zValidate', ['zDirectivesConfig', 'zValidateInfo', zValidate])
        .service('zValidateInfo', zValidateInfo)
        .provider('zDirectivesConfig', zDirectivesConfig);

    /*** IMPLEMENTATION ***/

    /* Breeze Float Equivalence directive
    *
    *  Adds a formatter to the ngModel controller.
    *  This formatter returns the view value rather than the model property value
    *  if the two values are deemed equivalent.
    *
    *  For explanation and more info, see 
    *  http://www.breezejs.com/breeze-labs/breezedirectivesfloat
    *
    *  Install
    * --------------------------------------------------
    *
    *   Make this module a dependency of your app module:
    *       var app = angular.module('app', ['breeze.directives']);
    *
    *   Add the directive to an input tag bound to a floating point property
    *     <input data-ng-model='vm.product.unitPrice' data-z-float />
    */
    function zFloat() {
        return {
            restrict: 'A',
            require: 'ngModel',

            link: function(scope, elm, attr, ngModelCtrl) {
                if (attr.type === 'radio' || attr.type === 'checkbox') return;
                ngModelCtrl.$formatters.push(equivalenceFormatter);
                
                function equivalenceFormatter(value){
                   var viewValue = ngModelCtrl.$viewValue // could have used 'elm.val()'
                   return (value === +viewValue) ? viewValue : value;
                }
            }
        };
    }

    /* Breeze Validation directive
    *
    *  Displays the model validation errors for an entity property
    *  and adds required indicator if the bound property is required
    *
    *  Install
    * --------------------------------------------------
    *     Include breeze.directives.css for default styling
    *       <link href="content/breeze.directives.css" rel="stylesheet" />
    *
    *     Make this module a dependency of your app module:
    *       var app = angular.module('app', ['breeze.directives']);
    *
    *  Usage for input elements (input|select|textarea):
    *  ---------------------------------------------------
    *   When scope is a viewmodel (vm):
    *     <input data-ng-model='vm.session.firstName' data-z-validate />
    *     <input data-ng-model='vm.session.track' data-z-validate='trackId' />
    *
    *   When within a repeater where scope is an entity:
    *     <input data-ng-model='title' data-z-validate />
    *
    *   Required indicator applied if the bound data property
    *   has a required validator. A required validator is a validator
    *   which has an validator.context.isRequired == true property (or is named 'required')
    *   See `zValidateInfo.getRequiredPropertiesForEntityType`
    *
    *  Usage for non-input elements (e.g. a div that formats the required and error msg):
    *  ---------------------------------------------------
    *   TBD
    *
    * Learn more at http://www.breezejs.com/breeze-labs/breezedirectivesvalidationjs
    */
    function zValidate(config, validateInfo) {
        var directive = {
            link: link,
            restrict: 'A',
            scope: true
        };

        return directive;

        function link(scope, element, attrs) {
            // get validation info for bound element and entity property
            var info = validateInfo.create(
                scope,
                attrs.ngModel,
                attrs.zValidate);

            if (!info.getValErrs) { return; } // can't do anything

            // Use only features defined in Angular's jqLite
            var domEl = element[0];
            var nodeName = domEl.nodeName;
            var isInput = nodeName == 'INPUT' || nodeName == 'SELECT' || nodeName == 'TEXTAREA';

            isInput ? linkForInput() : linkForNonInput();

            // directive is on an input element, so use templates for
            // required and validation display
            function linkForInput() {
                var valTemplate = config.zValidateTemplate;
                var requiredTemplate = config.zRequiredTemplate || '';
                var decorator = angular.element('<span class="z-decorator"></span>');
                element.after(decorator);

                // unwrap bound elements
                decorator = decorator[0];
                scope.$watch(info.getValErrs, valErrsChanged);

                // update the message in the validation template
                // when a validation error changes on an input control 
                function valErrsChanged(newValue) {

                    // HTML5 custom validity
                    // http://dev.w3.org/html5/spec-preview/constraints.html#the-constraint-validation-api
                    if (domEl.setCustomValidity) {
                        /* only works in HTML 5. Maybe should throw if not available. */
                        domEl.setCustomValidity(newValue);
                    }

                    var errorHtml = newValue ? valTemplate.replace(/%error%/, newValue) : "";
                    var isRequired = info.getIsRequired();
                    var requiredHtml = isRequired ? requiredTemplate : '';
                    decorator.innerHTML = (isRequired || !!errorHtml) ? requiredHtml + errorHtml : "";
                }
            }

            // directive is on another element (e.g. a div wrapping the input)
            // so set scope variables and let existing elements display validation
            // TODO: learn to discover the ngModel in the interior of the element
            //       rather than oblige developer to repeat it in the ngModel of this element
            function linkForNonInput() {

                scope.$watch(info.getValErrs, valErrsChanged);

                // update the message in the z_invalid and z_error properties in the scope
                // when a validation error changes on a non-input control 
                function valErrsChanged(newValue) {
                    var errorMsg = newValue ? newValue : "";
                    scope.z_error = errorMsg;
                    scope.z_invalid = !!errorMsg;
                    scope.z_required = info.getIsRequired();
                }
            }
        }
    }

    // Service to extract validation information from a zValidate data binding
    // Although built for Angular, it is designed to be used 
    // in alternative zValidate directive implementations
    function zValidateInfo() {

        // Info describing a bound entity's property's validation
        // 'scope' is the scope of the binding
        //      'scope.$eval(text)' evaluates 'text' in the context of that scope
        //      'scope.entityAspect' returns an EntityAspect if the scope is an Entity
        //      while this is an Ng concept, it could be modeled in other frameworks
        //
        // 'modelPath' is the entity property's data binding specification
        // by default the property from which validation information should be obtained.
        //
        // 'validationPath' is an alternative specification of the entity property
        // from which validation information should be obtained.
        function Info(scope, modelPath, validationPath) {

            // need some path info from either of these attrs or it's pointless
            if (!modelPath && !validationPath) { return; }

            this.scope = scope;

            setEntityAndPropertyPaths(this, modelPath, validationPath);
            // this.entityPath
            // this.propertyPath 

            this.getEntityAspect = this.entityPath ?
                    getEntityAspectFromEntityPath(this) :
                    getEntityAspect(this);

            this.getValErrs = createGetValErrs(this);
            this.isRequired = undefined; // don't know initially
        }

        Info.prototype = {
            constructor: Info,
            getIsRequired: getIsRequired,
            getType: getType
        };

        return {
            create: create,
        };

        /*** zValidateInfo implementation ***/

        // Create info about the data bound entity property
        function create(scope, modelPath, validationPath) {
            return new Info(scope, modelPath, validationPath);
        }

        // Create the 'getValErrs' function that will be watched
        function createGetValErrs(info) {
            return function () {
                var aspect = info.getEntityAspect();
                if (aspect) {
                    var errs = aspect.getValidationErrors(info.propertyPath);
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

        function getEntityAspect(info) {
            return function () {
                return info.scope.entityAspect;
            }
        }

        function getEntityAspectFromEntityPath(info) {
            return function () {
                try { return info.scope.$eval(info.entityPath)['entityAspect']; }
                catch (_) { return undefined; }
            }
        }

        // determine if bound property is required.
        function getIsRequired() {
            var info = this;
            if (info.isRequired !== undefined) { return info.isRequired; }

            // We don't know if it is required yet.
            // Once bound to the entity we can determine whether the data property is required
            // Note: Not bound until *second* call to the directive's link function
            //       which is why you MUST call 'getIsRequired' 
            //       inside 'valErrsChanged' rather than in the link function
            var entityType = info.getType();
            if (entityType) { // the bound entity is known
                var requiredProperties =
                    getRequiredPropertiesForEntityType(entityType);

                return info.isRequired = !!requiredProperties[info.propertyPath];
            }
            return undefined; // don't know yet
        }

        function getType() {
            var aspect = this.getEntityAspect();
            return aspect ? aspect.entity.entityType : null;
        }

        /*
        * getRequiredPropertiesForEntityType
        * Returns a hash of property names of properties that are required.
        * Creates that hash lazily and adds it to the
        * entityType's metadata for easier access by this directive
        */
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
            props.forEach(function (prop) {
                var vals = prop.validators;
                for (var i = vals.length; i--;) {
                    var val = vals[i];
                    // Todo: add the 'isRequired' property to breeze.Validator.required validator
                    if (val.context.isRequired || val.name === 'required') {
                        required[prop.name] = true;
                        break;
                    }
                }
            });
            return required;
        }

        function setEntityAndPropertyPaths(info, modelPath, validationPath) {

            // examples:
            //   'productId'               // property only
            //   'vm.order.delivery'       // entity path and property
            //   'vm.order["delivery"]'    // entity path and indexed property
            if (modelPath) {
                parsePath(modelPath);
            }
            // validationPath can override either entity or property path; 
            // examples:
            //   'productId'               // property only
            //   'vm.order.delivery'       // entity path and property
            //   'vm.order["delivery"]'    // entity path and indexed property
            //
            // optional ','  syntax as {entity, property} path separator
            // so can separate entity path from a complex property path
            // examples:
            //   'vm.order,address.street' // entity w/ complex prop 
            //   'vm.order,address[street]' // entity w/ complex indexed prop 
            if (validationPath) {
                // Look for ',' syntax
                var paths = validationPath.split(',');
                var pPath = paths.pop(); // after ','
                var ePath = paths.pop(); // before ','
                if (ePath) { info.entityPath = ePath.trim(); }

                if (info.entityPath) {
                    info.propertyPath = pPath;
                } else {
                    // Didn't use ',' syntax and didn't specify entityPath in model.
                    // Therefore entire path spec must be in pPath; parse it.
                    parsePath(pPath);
                }
            }

            function parsePath(path) {
                if (path[path.length - 1] === ']') {
                    parseIndexedPaths(path);
                } else {
                    parseDottedPath(path);
                }
            }

            function parseDottedPath(path) {
                // ex: 'vm.order.delivery'
                // propertyPath should be 'delivery'
                // entityPath should be 'vm.order'
                paths = path.split('.');
                info.propertyPath = paths.pop(); // property is after last '.' 
                info.entityPath = paths.join('.'); // path to entity is before last '.'                   
            }

            // extract paths from strings using square-bracket notation, e.g. 'vm.order[delivery]'
            function parseIndexedPaths(path) {
                var opensb = path.lastIndexOf('[');
                info.entityPath = path.substring(0, opensb);  // path to entity is before last [
                var propertyPath = path.substring(opensb + 1, path.length - 1); // property is between [ ]
                // eval it, in case it's an angular expression
                try { var evalPath = info.scope.$eval(propertyPath); }
                catch (_) { }
                info.propertyPath = evalPath ? evalPath : propertyPath;
            }
        }
    }

    /* Configure app to use breeze.directives
    *
    *  Configure breeze directive templates for zValidate
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
    function zDirectivesConfig() {
        // The default zValidate template for display of validation errors
        this.zValidateTemplate =
            '<span class="invalid">%error%</span>';

        // The default template for indicating required fields.
        // Assumes "icon-asterisk-invalid" from bootstrap css
        this.zRequiredTemplate =
            '<span class="icon-asterisk-invalid z-required" title="Required">*</span>';

        this.$get = function () {
            return {
                zValidateTemplate: this.zValidateTemplate,
                zRequiredTemplate: this.zRequiredTemplate
            };
        };
    };

})();