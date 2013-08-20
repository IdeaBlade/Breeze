define(['services/logger', 'durandal/system', 'services/utilities'],
    function(logger, system, util) {

        var ErrorHandler = (function() {

            var ctor = function(targetObject) {
                this.handleError = function(error) {
                    if (error.entityErrors) {
                        error.message = util.getSaveValidationErrorMessage(error);
                    }

                    logger.logError(error.message, null, system.getModuleId(targetObject), true);
                    throw error;
                };

                this.log = function(message, showToast) {
                    logger.log(message, null, system.getModuleId(targetObject), showToast);
                };
            };

            return ctor;
        })();

        return {
            includeIn: includeIn
        };

        function includeIn(targetObject) {
            return $.extend(targetObject, new ErrorHandler(targetObject));
        }
    });