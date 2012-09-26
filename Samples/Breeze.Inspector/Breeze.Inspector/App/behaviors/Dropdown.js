define(function() {
    return {
        attach: function(view, field) {
            var options = [];
            var parts = field.question.Options().split("|");

            parts.forEach(function(item) {
                options.push(item);
            });

            field.options = options;

            ko.compose("Dropdown", field, view, false, true);
        }
    };
});