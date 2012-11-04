define(function() {
    return {
        attach: function(view, field) {
            var options = [];
            var parts = field.question.Options().split("|");

            parts.forEach(function(item) {
                var text = item;
                options.push({
                    text: text,
                    checked: ko.computed({
                        read: function() {
                            var response = field.answer.Response() || "";
                            return response.indexOf(text) != -1;
                        },
                        write: function(value) {
                            var response = field.answer.Response() || "";

                            if (value) {
                                response += "|" + text;
                            } else {
                                response = response.replace("|" + text, "");
                            }

                            field.answer.Response(response);
                        }
                    })
                });
            });

            field.options = options;

            ko.compose("CheckboxGroup", field, view, false, true);
        }
    };
});