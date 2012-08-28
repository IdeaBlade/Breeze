define(function(require) {
    var count = 0;

    function getNextName() {
        return "group" + (++count).toString();
    }

    return {
        installInto: function(field) {
            var options = [];
            var parts = field.question.Options().split("|");

            parts.forEach(function(item) {
                options.push(item);
            });

            field.options = options;
            field.name = getNextName();
        }
    };
});