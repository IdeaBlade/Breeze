define(function() {
    return {
        attach: function(view, field) {
            ko.compose("Textarea", field, view, false);
        }
    };
});