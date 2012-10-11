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

    function getBaseURL() {
        var url = location.href;  // entire url including querystring - also: window.location.href;
        var baseURL = url.substring(0, url.indexOf('/', 14));


        if (baseURL.indexOf('http://localhost') != -1) {
            // Base Url for localhost
            var url = location.href;  // window.location.href;
            var pathname = location.pathname;  // window.location.pathname;
            var index1 = url.indexOf(pathname);
            var index2 = url.indexOf("/", index1 + 1);
            var baseLocalUrl = url.substr(0, index2);

            return baseLocalUrl + "/";
        }
        else {
            // Root Url for domain name
            return baseURL + "/";
        }

    }

    learn.run = function() {
        var container = document.getElementById("output-container");
        var frame = document.createElement("iframe");

        $(container).empty().append(frame);

        var htmlStart = "<!DOCTYPE html><html><head><scr" + "ipt src='/Scripts/jquery-1.7.2.min.js' type='text/javascript'></scr" + "ipt><scr" + "ipt src='/Scripts/knockout-2.1.0.js' type='text/javascript'></scr" + "ipt><scr" + "ipt src='/Scripts/q.js' type='text/javascript'></scr" + "ipt><scr" + "ipt src='/Scripts/breeze.debug.js' type='text/javascript'></scr" + "ipt></head><body>";
        var htmlEnd = "</body></html>";
        var html = htmlStart + this.currentHtml() + "<scr" + "ipt type='text/javascript'>" + this.currentJavascript() + "</scr" + "ipt>" + htmlEnd;

        var win = frame.contentWindow || frame.documentWindow;
        var doc = win.document;

        doc.open();
        doc.write(html);
        //doc.close();
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
            var that = this;
            this.firstUpdate = true;
            var editor = this.editor = CodeMirror.fromTextArea(element, {
                matchBrackets: true,
                tabMode: "indent",
                mode: "text/javascript",
                onUpdate: function() {
                    if (editor && !that.updating) {
                        that.updating = true;
                        var newValue = editor.getValue();
                        valueAccessor()(newValue);
                        that.updating = false;
                    }
                }
            });
        },
        update: function(element, valueAccessor) {
            if (this.updating || !this.firstUpdate) {
                return;
            }

            this.firstUpdate = false;
            this.updating = true;
            var value = ko.utils.unwrapObservable(valueAccessor());
            this.editor.setValue(value);
            this.updating = false;
        }
    };

    ko.bindingHandlers.htmlEditor = ko.bindingHandlers.jsEditor = {
        init: function(element, valueAccessor) {
            var that = this;
            this.firstUpdate = true;
            var editor = this.editor = CodeMirror.fromTextArea(element, {
                mode: "text/html",
                tabMode: "indent",
                onUpdate: function() {
                    if (editor && !that.updating) {
                        that.updating = true;
                        var newValue = editor.getValue();
                        valueAccessor()(newValue);
                        that.updating = false;
                    }
                }
            });
        },
        update: function(element, valueAccessor) {
            if (this.updating || !this.firstUpdate) {
                return;
            }

            this.firstUpdate = false;
            this.updating = true;
            var value = ko.utils.unwrapObservable(valueAccessor());
            this.editor.setValue(value);
            this.updating = false;
        }
    };

    ko.applyBindings(learn);

    return learn;
})(Learn || {}, $);