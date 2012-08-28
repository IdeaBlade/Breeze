define(function(require) {
    return {
        installInto: function(field) {
            field.isChecked = ko.computed({
                read: function() {
                    return field.answer.Response() == "Yes";
                },
                write: function(value) {
                    field.answer.Response(value ? "Yes" : "No");
                }
            });
        }
    };
});