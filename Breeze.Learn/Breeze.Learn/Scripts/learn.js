var Learn = (function(learn, $) {
    learn.activeTutorial = ko.observable(learn.tutorials[0]);
    learn.activeStep = ko.observable(learn.tutorials[0].Steps[0]);
    learn.currentHtml = ko.observable(learn.tutorials[0].StartingHtml);
    learn.currentJavascript = ko.observable(learn.tutorials[0].StartingJavascript);

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
        learn.currentHtml(learn.activeTutorial().StartingHtml);
        learn.currentJavascript(learn.activeTutorial().StartingJavascript);
    };

    learn.openHelp = function() {
        var $selectSource = $($('#ask-help-source').html());
        ko.applyBindings(learn, $selectSource.get(0));
        $selectSource.modal();
    };

    learn.selectHelp = function(answer) {
        if (answer == "Yes") {
            learn.currentHtml(learn.activeTutorial().EndingHtml);
            learn.currentJavascript(learn.activeTutorial().EndingJavascript);
        }
    };

    ko.bindingHandlers.jsEditor = {
        init: function(element, valueAccessor) {
            this.editor = CodeMirror.fromTextArea(element, {
                matchBrackets: true,
                tabMode: "indent"
            });
        },
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            this.editor.setValue(value);
        }
    };

    ko.bindingHandlers.htmlEditor = {
        init: function(element, valueAccessor) {
            this.editor = CodeMirror.fromTextArea(element, {
                mode: "text/html",
                tabMode: "indent"
            });
        },
        update: function(element, valueAccessor) {
            var value = ko.utils.unwrapObservable(valueAccessor());
            this.editor.setValue(value);
        }
    };

    ko.applyBindings(learn);

    return learn;
})(Learn || {}, $);