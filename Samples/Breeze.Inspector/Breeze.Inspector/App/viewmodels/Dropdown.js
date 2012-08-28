define(function(require) {
    return {
        installInto: function(field) {
            var options = [];
            var parts = field.question.Options().split("|");

            parts.forEach(function(item) {
                options.push(item);
            });

            field.options = options;
        }
    };
});