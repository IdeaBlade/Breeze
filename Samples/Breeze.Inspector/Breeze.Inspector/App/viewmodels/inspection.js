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

    var ctor = function(inspection) {
        this.inspection = inspection;
        this.fields = ko.observableArray([]);
        this.isValid = ko.computed(function() {
            var messages = [];

            this.fields().forEach(function(field) {
                var message = field.validationMessage();

                if (message) {
                    messages.push(message);
                }
            });

            return messages.length == 0;
        }, this);

        var questions = inspection.Form().Questions();

        for (var i = 0; i < questions.length; i++) {
            var question = questions[i];
            var answer = findOrCreateAnswer(inspection, question);

            this.fields.push(new Field(this, question, answer));
        }
    };

    ctor.prototype.activate = function() {
        var that = this;

        shell.title(this.inspection.Form().Type());
        shell.subtitle1("Inspector " + shell.inspector().Name());

        var loc = this.inspection.Job().Location();
        shell.subtitle2(loc.Street1() + ", " + loc.City() + ", " + loc.State());

        shell.status(that.inspection.Status());
        that.inspection.Status.subscribe(function(value) {
            shell.status(value);
        });

        shell.addCommand('save',
            function() {
                if (that.inspection.Status() == "New") {
                    that.inspection.Status("In Progress");
                }

                dataservice.saveInspection(that.inspection);
            },
            ko.computed(function() {
                return this.inspection.Status() != 'Done';
            }, this)
        );

        shell.addCommand('clear',
            function() {
                for (var i = 0; i < that.fields.length; i++) {
                    var current = that.fields[i];
                    current.answer.Response('');
                }

                if (that.inspection.Status() != "New") {
                    that.inspection.Status("In Progress");
                }
            },
            ko.computed(function() {
                return this.inspection.Status() != 'Done';
            }, this)
        );

        shell.addCommand(
            ko.computed(function() {
                return this.inspection.Status() == 'Done' ? 'reopen' : 'done';
            }, this),
            function() {
                if (that.inspection.Status() == 'Done') {
                    that.inspection.Status('In Progress');
                } else {
                    that.inspection.Status('Done');
                }

                dataservice.saveInspection(that.inspection);
            },
            ko.computed(this.isValid, this)
        );

        shell.addCommand('cancel',
            function() {
                that.inspection.Status('Canceled');
                dataservice.saveInspection(that.inspection);
                shell.goBack();
            },
            ko.computed(function() {
                return this.inspection.Status() != 'Done' && this.inspection.Status() != 'Canceled';
            }, this)
        );
    };

    return ctor;
});