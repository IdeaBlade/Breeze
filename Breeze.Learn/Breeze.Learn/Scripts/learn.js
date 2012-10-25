var Learn = (function(learn, $) {

    // $("#Vsplitter").splitter({ resizeToWidth: true });
    
    learn.activeTutorial = ko.observable(learn.tutorials[0]);
    learn.activeStepNumber = ko.observable(1);
    learn.currentInstructions = ko.observable();
    learn.currentHtml = ko.observable();
    learn.currentJavascript = ko.observable();
    
    showStep(0);
    
    
    learn.maxStepNumber = ko.computed(function () {
        // the last step is not actually a real step; it is just where the 
        // final javascript and html are stored.
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
        frame.frameBorder = 0;
        // frame.scrolling = "no";
        $(container).empty().append(frame);

        var htmlStart = "<html><head><scr" + "ipt src='/Scripts/jquery-1.8.2.js' type='text/javascript'></scr"
            + "ipt><scr" + "ipt src='/Scripts/knockout-2.1.0.js' type='text/javascript'></scr"
            + "ipt><scr" + "ipt src='/Scripts/q.js' type='text/javascript'></scr"
            + "ipt><scr" + "ipt src='/Scripts/breeze.debug.js' type='text/javascript'></scr"
            + "ipt></head><body>";
        var htmlEnd = "</body></html>";
        var html = htmlStart + this.currentHtml() + "<scr"
            + "ipt type='text/javascript'>window.onload = function(){ try { " + this.currentJavascript() + "} catch (e) { alert('Not working: ' + e) }}</scr"
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

    var $selectSource;

    learn.selectTutorial = function() {
        $('#dialog-select-tutorial').dialog({
            resizable: false
        });
    };

    learn.finishSelection = function (tutorial) {
        $('#dialog-select-tutorial').dialog('close');       
        learn.activeTutorial(tutorial);
        learn.activeStepNumber(1);
        showStep(0); 
    };

    
    learn.notWorking = function () {
        $("#dialog-notworking").dialog({
            resizable: false,
            //height: 200,
            width: 500,
            modal: true,
            buttons: {
                "Yes! Fix my javascript and html" : function () {
                    var nextStepIx = learn.activeStepNumber();
                    showJavascript(nextStepIx);
                    showHtml(nextStepIx);
                    learn.run();
                    $(this).dialog("close");
                },
                Cancel: function () {
                    $(this).dialog("close");
                }
            }
        });
    }

    learn.selectHelp = function(answer) {
        if (answer == "Yes") {
            var nextStepIx = learn.activeStepNumber();
            showJavascript(nextStepIx);
            showHtml(nextStepIx);
            this.run();
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
            var markdownValue = valueAccessor()();
            var htmlValue = markdownValue && new Showdown.converter().makeHtml(markdownValue);
            if (Learn.canMoveNext()) {
                htmlValue = htmlValue + '<button class="button" onclick=Learn.moveNext()><strong>Continue to next step</strong></button><br><br>';
            }
            $(element).html(htmlValue || "");
            // colorize code
            $('pre code', element).each(function () {
                hljs.highlightBlock(this, '    ' /* tab = four spaces */);
            });
        }
    };

    ko.applyBindings(learn);
    // $("#Vsplitter").css("height", "100%").css("width", "100%").splitter();
    // $("#Vsplitter").splitter({ anchorToWindow: true, resizeOnWindow: true });
    // $("#Vsplitter").trigger("resize");
    
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
        $('#instructions').scrollTop(0);
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
    
    function createBindingHandler(editorName, config) {
        
        return {
            init: function (element, valueAccessor, allBindingAccessor, viewModel, bindingContext) {
                var editor;
                var baseConfig = {
                    //extraKeys: {"Enter": false},
                    onUpdate: function () {
                        if (editor) {
                            var newValue = editor.getValue();
                            valueAccessor()(newValue);
                        } 
                    }
                };
                config = extendConfig(baseConfig, config);
                editor = viewModel[editorName] = CodeMirror.fromTextArea(element, config);
            },
            update: function (element, valueAccessor, allBindingAccessor, viewModel, bindingContext) {
                var editor = viewModel[editorName];
                var newValue = valueAccessor()();
                var oldValue = editor.getValue();
                if (oldValue !== newValue) {
                    editor.setValue(newValue);
                }
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

    return learn;
})(Learn || {}, $);