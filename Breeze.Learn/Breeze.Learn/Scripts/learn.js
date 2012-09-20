var Learn = (function(learn, $) {
    learn.activeTutorial = ko.observable(learn.tutorials[0]);
    learn.activeStep = ko.observable(learn.tutorials[0].Steps[0]);

    learn.maxStepNumber = ko.computed(function() {
        return learn.activeTutorial().Steps.length;
    });
    learn.activeStepNumber = ko.computed(function() {
        var steps = learn.activeTutorial().Steps;
        var currentStep = learn.activeStep();
        return steps.indexOf(currentStep) + 1;
    });

    learn.canMoveNext = ko.computed(function() {
        return learn.activeStepNumber() < learn.maxStepNumber();
    });
    learn.moveNext = function() {
        learn.activeStep(learn.activeTutorial().Steps[learn.activeStepNumber()]);
    };

    learn.canMovePrevious = ko.computed(function() {
        return learn.activeStepNumber() > 1;
    });
    learn.movePrevious = function() {
        learn.activeStep(learn.activeTutorial().Steps[learn.activeStepNumber() - 2]);
    };

    learn.run = function() {
        //create iframe
        //write body and script
        //write html
        //add iframe to page
    };

    learn.selectTutorial = function() {
        var $selectSource = $($('#select-tutorial-source').html());
        ko.applyBindings(learn, $selectSource.get(0));
        $selectSource.modal();
    };

    learn.finishSelection = function(tutorial) {
        learn.activeTutorial(tutorial);
        learn.activeStep(tutorial.Steps[0]);
    };

    learn.help = function() {
        $('#ask-help').modal();

        //ask user if the want to see final code
        //switch editors to ending contents
    };

    ko.bindingHandlers.jsEditor = {
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var el = $(element);

            el.val(value);

            var editor = CodeMirror.fromTextArea(element, {
                matchBrackets: true,
                tabMode: "indent"
            });
        }
    };

    ko.bindingHandlers.htmlEditor = {
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            var el = $(element);

            el.val(value);

            var editor = CodeMirror.fromTextArea(element, {
                mode: "text/html",
                tabMode: "indent"
            });
        }
    };

    ko.applyBindings(learn);

    return learn;
})(Learn || {}, $);