define(function() {
    var ctor = function(entity) {
        var that = this;

        for (var prop in entity) {
            this[prop + "Valid"] = ko.observable(true);
            this[prop + "Error"] = ko.observable(null);
        }

        entity.entityAspect.validationErrorsChanged.subscribe(function() {
            var errors = entity.entityAspect.getValidationErrors();

            setTimeout(function() {
                for (var i = 0; i < errors.length; i++) {
                    var current = errors[i];
                    var propertyName = current.property.name;

                    console.log(propertyName);
                    console.log(current.errorMessage);

                    that[propertyName + "Valid"](current.errorMessage == null);
                    that[propertyName + "Error"](current.errorMessage);
                }
            }, 1);
            
        });
    };

    return ctor;
});