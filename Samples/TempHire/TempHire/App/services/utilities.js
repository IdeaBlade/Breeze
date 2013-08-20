define(function () {

    return {
        getCurrentDate: getCurrentDate,
        getSaveValidationErrorMessage: getSaveValidationErrorMessage,
        getEntityValidationErrorMessage: getEntityValidationErrorMessage
    };

    function getCurrentDate() {
        return new Date();
    }

    // Provisional version returns validation error messages 
    // of first entity that failed to save
    function getSaveValidationErrorMessage(saveError) {
        try { // return the first entity's error message(s)
            var firstError = saveError.entityErrors[0];
            return 'Validation Error: ' + firstError.errorMessage;
        } catch (e) { // ignore problem extracting error message 
            return "Save validation error";
        }
    }

    // Return string of an entity's validation error messages 
    function getEntityValidationErrorMessage(entity) {
        try {
            var errs = entity.entityAspect.getValidationErrors();
            var errmsgs = errs.map(function (ve) { return ve.errorMessage; });
            return errmsgs.length ? errmsgs.join("; ") : "no validation errors";
        } catch (e) {
            return "not an entity";
        }
    }
});
