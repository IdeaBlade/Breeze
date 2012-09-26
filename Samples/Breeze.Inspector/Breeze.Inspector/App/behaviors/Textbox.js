define(function() {
    return {
        attach: function(view, field) {
            ko.compose("Textbox", field, view, false, true);
        }
    };
});