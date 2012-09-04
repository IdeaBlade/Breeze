define(function() {
    return {
        attach: function(view, field) {
            field.isChecked = ko.computed({
                read: function() {
                    return field.answer.Response() == "Yes";
                },
                write: function(value) {
                    field.answer.Response(value ? "Yes" : "No");
                }
            });

            ko.compose("Checkbox", field, view, false);
        }
    };
});