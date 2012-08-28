define(function(require) {
    var dataservice = require('services/dataservice'),
        shell = require('viewmodels/shell');

    var field = function(question, answer) {
        this.question = question;
        this.answer = answer;
        this.validationMessage = ko.computed(function() {
            function checkPattern() {
                var pattern = question.ResponsePattern();
                if (!pattern || pattern.length < 1) {
                    return null;
                }

                return new RegExp(question.ResponsePattern()).test(answer.Response()) ? null : question.Text() + " format incorrect";
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

    function findOrCreateAnswer(inspection, question) {
        var answers = inspection.Answers();

        for (var i = 0; i < answers.length; i++) {
            var answer = answers[i];
            var associatedQuestion = answer.Question();

            if (associatedQuestion.Id() === question.Id()) {
                return answer;
            }
        }

        var newAnswer = dataservice.createAnswer(inspection, question);
        answers.push(newAnswer);
        return newAnswer;
    }

    var vm = function(inspection) {
        this.inspection = inspection;
        this.fields = ko.observableArray([]);

        var questions = inspection.Form().Questions();

        for (var i = 0; i < questions.length; i++) {
            var question = questions[i];
            var answer = findOrCreateAnswer(inspection, question);

            this.fields.push(new field(question, answer));
        }

        this.validationMessages = ko.computed(function() {
            var messages = [];

            this.fields().forEach(function(field) {
                var message = field.validationMessage();

                if (message) {
                    messages.push(message);
                }
            });

            return messages;
        }, this);

        this.validationMessages.subscribe(function(value) {
            shell.validationMessages(value);
        });
    };

    vm.prototype.activate = function() {
        shell.title(this.inspection.Form().Type());
    };

    return vm;
});