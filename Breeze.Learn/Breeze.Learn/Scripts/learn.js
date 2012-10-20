var Learn = (function(learn, $) {
    
    learn.activeTutorial = ko.observable(learn.tutorials[0]);
    learn.activeStepNumber = ko.observable(1);
    learn.currentInstructions = ko.observable();
    learn.currentHtml = ko.observable();
    learn.currentJavascript = ko.observable();
    showStep(0);
    
    learn.maxStepNumber = ko.computed(function() {
        return learn.activeTutorial().Steps.length - 1;
    });
    
    learn.activeStep = ko.computed(function() {
        return learn.activeTutorial().Steps[learn.activeStepNumber()-1];
    });

    learn.canMoveNext = ko.computed(function() {
        return learn.activeStepNumber() < learn.maxStepNumber();
    });
    
    learn.moveNext = function () {
        learn.activeStepNumber(learn.activeStepNumber() + 1);
        showStep();
    };

    learn.canMovePrevious = ko.computed(function() {
        return learn.activeStepNumber() > 1;
    });
    
    learn.movePrevious = function () {
        learn.activeStepNumber(learn.activeStepNumber() - 1);
        showStep();
    };

    
    learn.run = function() {
        var container = document.getElementById("output-container");
        var frame = document.createElement("iframe");

        $(container).empty().append(frame);

        var htmlStart = "<html><head><scr" + "ipt src='/Scripts/jquery-1.7.2.min.js' type='text/javascript'></scr"
            + "ipt><scr" + "ipt src='/Scripts/knockout-2.1.0.js' type='text/javascript'></scr"
            + "ipt><scr" + "ipt src='/Scripts/q.js' type='text/javascript'></scr"
            + "ipt><scr" + "ipt src='/Scripts/breeze.debug.js' type='text/javascript'></scr"
            + "ipt></head><body>";
        var htmlEnd = "</body></html>";
        var html = htmlStart + this.currentHtml() + "<scr"
            + "ipt type='text/javascript'>window.onload = function(){" + this.currentJavascript() + "};</scr"
            + "ipt>" + htmlEnd;

        var doc = null;
        if (frame.contentDocument) {
            doc = frame.contentDocument;
        } else if (frame.contentWindow) {
            doc = frame.contentWindow.document;
        } else if (frame.document) {
            doc = frame.document;
        }

        doc.open();
        doc.write(html);
        doc.close();
    };

    learn.selectTutorial = function() {
        var $selectSource = $($('#select-tutorial-source').html());
        ko.applyBindings(learn, $selectSource.get(0));
        $selectSource.modal();
    };

    learn.finishSelection = function(tutorial) {
        learn.activeTutorial(tutorial);
        learn.activeStepNumber(1);
        showStep(0); 
    };

    learn.openHelp = function() {
        var $selectSource = $($('#ask-help-source').html());
        ko.applyBindings(learn, $selectSource.get(0));
        $selectSource.modal();
    };

    learn.selectHelp = function(answer) {
        if (answer == "Yes") {
            var nextStepIx = learn.activeStepNumber();
            showJavascript(nextStepIx);
            showHtml(nextStepIx);
        }
    };
    
    ko.bindingHandlers.jsEditor = createBindingHandler("jsEditor", {
        mode: "text/javascript"
    });

    ko.bindingHandlers.htmlEditor = createBindingHandler("htmlEditor", {
        mode: "text/html"
    });

    ko.bindingHandlers.markdown = {
        update: function (element, valueAccessor) {
            var markdownValue = ko.utils.unwrapObservable(valueAccessor());
            var htmlValue = markdownValue && new Showdown.converter().makeHtml(markdownValue);
            $(element).html(htmlValue || "");
        }
    };

    ko.applyBindings(learn);
    
    function showStep(stepIx) {
        if (stepIx === undefined) {
            stepIx = learn.activeStepNumber()-1;
        }
        showInstructions(stepIx);
        showJavascript(stepIx);
        showHtml(stepIx);
    }
   
    function showInstructions(stepIx) {
        var step = learn.activeTutorial().Steps[stepIx];
        learn.currentInstructions(step.Instructions);
    }
    
    function showJavascript(stepIx) {
        var step = learn.activeTutorial().Steps[stepIx];
        if (step.StartingJavascript) {
            learn.currentJavascript(step.StartingJavascript);
        } else if (stepIx > 0) {
            showJavascript(stepIx - 1);
        } else {
            learn.currentJavascript("");
        }
    }
    
    function showHtml(stepIx) {
        var step = learn.activeTutorial().Steps[stepIx];
        if (step.StartingHtml) {
            learn.currentHtml(step.StartingHtml);
        } else if (stepIx > 0) {
            showHtml(stepIx - 1);
        } else {
            learn.currentHtml("");
        }
    }
    
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
  
    function createBindingHandler(editorName, config) {

        return {
            init: function (element, valueAccessor, allBindingAccessor, viewModel, bindingContext) {
                var that = this;
                this.firstUpdate = true;
                var baseConfig = {
                    //extraKeys: {"Enter": false},
                    onUpdate: function () {
                        if (editor && !that.updating) {
                            that.updating = true;
                            var newValue = editor.getValue();
                            valueAccessor()(newValue);
                            that.updating = false;
                        }
                    }
                };
                config = extendConfig(baseConfig, config);
                var editor = viewModel[editorName] = CodeMirror.fromTextArea(element, config);

            },
            update: function (element, valueAccessor, allBindingAccessor, viewModel, bindingContext) {
                if (this.updating && !this.firstUpdate) {
                    return;
                }

                this.firstUpdate = false;
                this.updating = true;
                var value = ko.utils.unwrapObservable(valueAccessor());
                viewModel[editorName].setValue(value);
                this.updating = false;
            }
        };


    }
    
    function extendConfig(config, extConfig) {
        if (extConfig) {
            for (var key in extConfig) {
                if (extConfig.hasOwnProperty(key)) {
                    config[key] = extConfig[key];
                }
            }
        }
        return config;
    }

    return learn;
})(Learn || {}, $);