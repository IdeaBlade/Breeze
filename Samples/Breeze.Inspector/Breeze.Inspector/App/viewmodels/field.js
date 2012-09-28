define(function(require) {
    var field = function(owner, question, answer) {
        this.question = question;
        this.answer = answer;

        this.validationMessage = ko.computed(function() {
            function checkPattern() {
                var pattern = question.ResponsePattern();
                if (!pattern || pattern.length < 1) {
                    return null;
                }

                return new RegExp(question.ResponsePattern()).test(answer.Response())
                    ? null
                    : question.Text() + " format incorrect";
            }

            if (question.IsRequired()) {
                var response = answer.Response();
                if (response && response.length > 0) {
                    return checkPattern();
                }

                return question.Text() + " answer required";
            }

            return checkPattern();
        });
    };

    return field;
});