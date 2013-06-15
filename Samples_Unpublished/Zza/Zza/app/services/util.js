(function () {
    'use strict';
    angular.module('app').factory('util',       
        ['breeze','config','logger','$q','$timeout','$rootScope', util]);

    function util(breeze, config, logger, $q, $timeout, $rootScope) {

        extendString();
        extendQ();
        config.userSessionId = newGuidComb();
        initAjaxAdapter(config.userSessionId);
        
        var service = {
            // bundle these so util clients don't have to get them
            $q: $q,
            $timeout: $timeout,
            breeze: breeze,
            config: config,
            logger: logger,
  
            // actual utilities
            $apply: $apply,
            to$q: to$q,
            newGuidComb: newGuidComb,
            getSaveErrorMessages: getSaveErrorMessages,
            getEntityValidationErrMsgs: getEntityValidationErrMsgs,
            
            databaseReset: databaseReset
        };
        
        return service;
 
        /*********************************************************
        * @method $apply {Void} easy access to $rootScope.$apply
        * @param [func]{function} optional niladic function to call
        *********************************************************/
        function $apply() {
            if ($rootScope.$$phase) {
                // from http://docs.angularjs.org/api/ng.$rootScope.Scope
                if (arguments[0]) {
                    try {
                        $rootScope.$eval(arguments[0]);
                    } catch(e) {
                        logger.error(e);
                    }
                }
            } else {
                $rootScope.$apply.apply($rootScope, arguments);
            }           
        }
        
        /*********************************************************
        * @method to$q {Promise} Convert a Q.js promise into an angular $q
        * @param promiseQ {Promise} the Q.js promise to convert
        * @param [should$apply] {Boolean} should automatic call $apply
        *        @default true
        * The Q promise must return some value when they succeed or
        * rethrow the error if they fail. Else this method logs a warning.
        *********************************************************/
        function to$q(promiseQ, should$apply) {
            var d = $q.defer();
            promiseQ
                .then(function (data) {
                    if (data === undefined) {
                        logger.warning("Programming error: no data. "+
                        "Perhaps success callback didn't return a value or " +
                         "fail callback didn't re-throw error");
                    }
                    d.resolve(data);
                })
               .fail(function (error) {
                    d.reject(error);
                });
            
            if (should$apply === undefined || should$apply) promiseQ.fin($apply);
            return d.promise;
        }
        // monkey patch this method into Q.js' promise prototype
        function extendQ() {
            var fn = Q.defer().promise.__proto__;
            if (fn.to$q) return; // exists; don't reset
            fn.to$q = function(no$apply) { return to$q(this, no$apply); };
        }
        /*********************************************************
        * Generate a new GuidCOMB Id (sequential for MS SQL Server)
        * @method newGuidComb {String}
        * @param [n] {Number} Optional integer value for a particular time value
        * if not supplied (and usually isn't), n = new Date.getTime()
        *********************************************************/
        function newGuidComb(n) {
            // Create a pseudo-Guid whose trailing 6 bytes (12 hex digits) are timebased
            // Start either with the given getTime() value, n, or get the current time in ms.
            // Each new Guid is greater than next if more than 1ms passes
            // See http://thatextramile.be/blog/2009/05/using-the-guidcomb-identifier-strategy
            // Based on breeze.core.getUuid which is based on this StackOverflow answer
            // http://stackoverflow.com/a/2117523/200253     
            // Convert time value to hex: n.toString(16)
            // Make sure it is 6 bytes long: ('00'+ ...).slice(-12) ... from the rear
            // Replace LAST 6 bytes (12 hex digits) of regular Guid (that's where they sort in a Db)
            // Play with this in jsFiddle: http://jsfiddle.net/wardbell/qS8aN/
            var timePart = ('00' + (n || (new Date().getTime())).toString(16)).slice(-12);
            return 'xxxxxxxx-xxxx-4xxx-yxxx-'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0,
                    v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            }) + timePart;
        }

        /*********************************************************
        * Handle save error messages
        *********************************************************/
        function getSaveErrorMessages(error) {
            var msg = error.message;
            var detail = error.detail;
            if (msg.match(/validation error/i)) {
                return getValidationMessages(error);
            } else if (detail && detail.ExceptionType &&
                detail.ExceptionType.indexOf('OptimisticConcurrencyException') !== -1) {
                // Concurrency error 
                return "Another user, perhaps the server, " +
                    "may have changed or deleted an entity in the change-set.";
            }
            return msg;
        }

        function getValidationMessages(error) {

            var detail = error.detail;

            if (detail) { // Failed validation on the server
                try {
                    return 'Server ' + detail.ExceptionMessage + '\nStackTrace: ' + detail.StackTrace;
                } catch (e) {
                    return 'Server ' + error.message;
                }
            }

            // Failed on client during pre-Save validation
            try {
                return error.entitiesWithErrors.map(function (entity) {
                    return entity.entityAspect.getValidationErrors().map(function (valError) {
                        return valError.errorMessage;
                    }).join(', \n');
                }).join('; \n');
            }
            catch (e) {
                return "validation error (error parsing exception :'" + e.message + "')";
            }
        }

        /*********************************************************
        * Return an entity's validation error messages as a string
        *********************************************************/
        function getEntityValidationErrMsgs(entity) {
            var errs = entity.entityAspect.getValidationErrors();
            return errs.length ?
                errs.map(function (err) { return err.errorMessage; }).join(", ") :
                "no errors";
        }

        /*********************************************************
        * Reset
        *********************************************************/
        function databaseReset() {
            stop(); // pause test runner while we reset
            var deferred = $q.defer();

            $.post(confirm.serviceName + '/reset',
                function (data, textStatus, xhr) {
                    deferred.resolve(
                       "Reset svc returned '" + xhr.status + "' with message: " + data);
                })
            .error(function (xhr, textStatus, errorThrown) {
                deferred.reject(getjQueryError(xhr, textStatus, errorThrown));
            });

            return deferred.promise;
        }

        /*********************************************************
        * Make a good error message from jQuery Ajax failure
        *********************************************************/
        function getjQueryError(xhr, textStatus, errorThrown) {
            if (!xhr) {
                return errorThrown;
            }
            var message = xhr.status + "-" + xhr.statusText;
            try {
                var reason = JSON.parse(xhr.responseText).Message;
                message += "\n" + reason;
            } catch (ex) {
                message += "\n" + xhr.responseText;
            }
            return message;
        }
    
        /*********************************************************
        * Ajax Adapter setup
        *********************************************************/
        function initAjaxAdapter(userSessionId) {
            // get the current default Breeze AJAX adapter
            var ajaxAdapter = breeze.config.getAdapterInstance("ajax");
            ajaxAdapter.defaultSettings = {
                headers: {
                    "X-UserSessionId": userSessionId
                },
            };
        }

        /*******************************************************
        * String extensions
        * Monkey punching JavaScript native String class
        * w/ format, startsWith, endsWith
        * go ahead and shoot me but it's convenient 
        ********************************************************/
        function extendString() {
            var stringFn = String.prototype;

            // Ex: "{0} returned {1} item(s)".format(queryName, count));
            stringFn.format = stringFn.format || function () {
                var s = this;
                for (var i = 0, len = arguments.length; i < len; i++) {
                    var reg = new RegExp("\\{" + i + "\\}", "gm");
                    s = s.replace(reg, arguments[i]);
                }

                return s;
            };

            stringFn.endsWith = stringFn.endsWith || function (suffix) {
                return (this.substr(this.length - suffix.length) === suffix);
            };

            stringFn.startsWith = stringFn.startsWith || function (prefix) {
                return (this.substr(0, prefix.length) === prefix);
            };

            stringFn.contains = stringFn.contains || function (value) {
                return (this.indexOf(value) !== -1);
            };
        }
    }
})();