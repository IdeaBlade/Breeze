define(function() {
    var ctor = function(entity) {
        var that = this;
        var allProps = [];

        for (var prop in entity) {
            this[prop + "Invalid"] = ko.observable(false);
            this[prop + "Error"] = ko.observable(null);
            allProps.push(prop);
        }

        this.isValid = ko.observable(true);

        entity.entityAspect.validationErrorsChanged.subscribe(function() {
            var errors = entity.entityAspect.getValidationErrors(),
                saved = allProps,
                current,
                i;
            allProps = [];

            setTimeout(function() {
                if (errors.length > 0) {
                    that.isValid(false);
                } else {
                    that.isValid(true);
                }

                for (i = 0; i < errors.length; i++) {
                    current = errors[i];
                    var propertyName = current.property.name;

                    that[propertyName + "Invalid"](current.errorMessage != null);
                    that[propertyName + "Error"](current.errorMessage);

                    allProps.push(propertyName);
                }

                for (i = 0; i < saved.length; i++) {
                    current = saved[i];

                    if (allProps.indexOf(current) == -1) {
                        allProps.push(current);

                        that[current + "Invalid"](false);
                        that[current + "Error"](null);
                    }
                }
            }, 1);
        });
    };

    return ctor;
});