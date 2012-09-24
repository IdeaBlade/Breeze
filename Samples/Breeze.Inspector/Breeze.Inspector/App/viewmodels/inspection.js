define(function(require) {
    var dataservice = require('services/dataservice'),
        shell = require('viewmodels/shell'),
        Field = require('viewmodels/field');

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

            this.fields.push(new Field(question, answer));
        }
    };

    vm.prototype.activate = function() {
        shell.title(this.inspection.Form().Type());
        shell.subtitle1("Inspector " + shell.inspector().Name());

        var loc = this.inspection.Job().Location();
        shell.subtitle2(loc.Street1() + ", " + loc.City() + ", " + loc.State());

        shell.addCommand('save',
            function() {
                alert('not implemented');
            }
        );

        shell.addCommand('clear',
            function() {
                alert('not implemented');
            }
        );

        shell.addCommand('done', //or reopen
            function() {
                alert('not implemented');
            },
            ko.computed(function() {
                var messages = [];

                this.fields().forEach(function(field) {
                    var message = field.validationMessage();

                    if (message) {
                        messages.push(message);
                    }
                });

                return messages.length == 0;
            }, this)
        );

        shell.addCommand('cancel',
            function() {
                alert('not implemented');
            },
            ko.observable(false)
        );
    };

    return vm;
});