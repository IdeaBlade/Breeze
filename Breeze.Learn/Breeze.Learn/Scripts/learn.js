var Learn = (function (learn, $, _gaq) {
    // one page view for each entry
    _gaq.push(['_trackPageview',"/tutorials"]);

    learn.activeTutorial = ko.observable(learn.tutorials[0]);
    learn.activeStepNumber = ko.observable(1);
    learn.currentInstructions = ko.observable();
    learn.currentHtml = ko.observable();
    learn.currentJavascript = ko.observable();
    
    showStep(0);
    
    learn.trackEvent = function (eventLabel, includeStep) {
        includeStep = (includeStep === false) ? false : true;
        if (includeStep) {
            eventLabel = "Step " + learn.activeStepNumber() + ": " + eventLabel;
        }
        _gaq.push(['_trackEvent', 'Tutorials', learn.activeTutorial().Moniker, eventLabel]);
    };
    
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
        learn.trackEvent("next");
        learn.activeStepNumber(learn.activeStepNumber() + 1);
        showStep();
    };

    learn.canMovePrevious = ko.computed(function() {
        return learn.activeStepNumber() > 1;
    });
    
    learn.movePrevious = function () {
        learn.trackEvent("previous");
        learn.activeStepNumber(learn.activeStepNumber() - 1);
        showStep();
    };

    
    learn.run = function () {
        learn.trackEvent("run");
        var container = document.getElementById("output-container");
        var frame = document.createElement("iframe");
        frame.frameBorder = 0;
        $(container).empty().append(frame);

        var isAngular = this.activeTutorial().Title.toLowerCase().indexOf("angular") >= 0;

        var htmlStart = "<html><head>"
            + "<link rel='stylesheet' href='/Styles/output.css'/>"
            + "</head><body>";
        var htmlEnd = "</body></html>";
        
        var scripts = buildScript("/Scripts/jquery-1.8.2.js")
            + (isAngular ? buildScript("/Scripts/angular.js") : buildScript("/Scripts/knockout-2.1.0.js"))
            + buildScript("/Scripts/q.js")
            + buildScript("/Scripts/breeze.debug.js");


        var bootstrap = buildScript("", buildOnLoad(this.currentJavascript(), isAngular)); 
       
        var html = htmlStart + this.currentHtml() + scripts + bootstrap + htmlEnd;
        
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
    
    function buildScript(src, content) {
        content = content || "";
        var scriptTag = "<scr" + "ipt ";
        var attributes = src ? "src='" + src + "'" : "";
        var scriptEndTag = "</scr" + "ipt>";
        return scriptTag + attributes + ">" + content + scriptEndTag + "\r";
    }

    function buildOnLoad(currentJavascript, isAngular) {
        var prefix = isAngular ? "var app = angular.module('LearnModule', []);\r" : "";
        var suffix = isAngular ? "angular.bootstrap(document, ['LearnModule']);\r" : "";
        return "\rwindow.onload = function() {\rtry { "
            + prefix
            + currentJavascript
            + suffix
            + "\r} catch (e) { alert('Not working: ' + e) }}";
    }

    learn.selectTutorial = function() {
        $('#dialog-select-tutorial').dialog({
            resizable: false,
            width: 600,
            position: { at: "top+35%" }
        });
    };

    learn.finishSelection = function (tutorial) {
        $('#dialog-select-tutorial').dialog('close');       
        learn.activeTutorial(tutorial);
        learn.activeStepNumber(1);
        showStep(0);
        learn.trackEvent("select-tutorial", false);
    };

    learn.about = function () {
        learn.trackEvent("about", false);
        $('#dialog-about').dialog({
            resizable: false,
            position: { at: "top+35%" }
        });
    };


    learn.notWorking = function() {
        $("#dialog-notworking").dialog({
            resizable: false,
            position: { at: "top+35%" },
            width: 375,
            modal: true,
            buttons: {
                "Yes! Fix my JavaScript and Html": function () {
                    learn.trackEvent("help");
                    var nextStepIx = learn.activeStepNumber();
                    showJavascript(nextStepIx);
                    showHtml(nextStepIx);
                    learn.run();
                    $(this).dialog("close");
                },
                Cancel: function() {
                    $(this).dialog("close");
                }
            }
        });
    };

    //learn.selectHelp = function(answer) {
    //    if (answer == "Yes") {
    //        learn.trackEvent("help");
    //        var nextStepIx = learn.activeStepNumber();
    //        showJavascript(nextStepIx);
    //        showHtml(nextStepIx);
    //        this.run();
    //    }
    //};
    
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
            } else {
                htmlValue = htmlValue + '<button class="button" onclick=Learn.selectTutorial()><strong>Next tutorial</strong></button><br><br>';
            }
            $(element).html(htmlValue || "");
            // colorize code
            $('pre code', element).each(function () {
                hljs.highlightBlock(this, '    ' /* tab = four spaces */);
            });
        }
    };

    ko.applyBindings(learn);
    

    $("#vSplitter").splitter({
        type: "v",
        accessKey: "I",
        minLeft: 200,
        minRight: 200,
        anchorToWindow: true,
        resizeOnWindow: true,
        outline: true
    });
    
    var h = window.innerHeight;

    $("#hSplitterLeft").splitter({
        type: "h",
        anchorToWindow: true,
        resizeOnWindow: true,
        sizeTop: h*.6,
        minTop: 200,
        minBottom: 200,
        accessKey: "H"
    });
    
    $("#hSplitterRight").splitter({
        type: "h",
        anchorToWindow: true,
        resizeOnWindow: true,
        sizeTop: h*.5,
        minTop: 200,
        minBottom: 200,
        accessKey: "H"
    });

    resizeWhenMoved(".vsplitbar");
    
    // This is a hack for IE.  The js and html windows don't paint the very first time
    // without this.
    setTimeout(function () {
        learn.currentJavascript("");
        learn.currentHtml("");
        showStep(0);
    });
    
    learn.trackEvent("enter", false);
   
    function resizeWhenMoved(elementName) {
        var isDragging = false;
        $(elementName).mousedown(function () {
            $(elementName).mousemove(function () {
                isDragging = true;
                $(elementName).unbind("mousemove");
            });
        });
        $(elementName).mouseup(function () {
            var wasDragging = isDragging;
            isDragging = false;
            $(elementName).unbind("mousemove");
            if (wasDragging) {
                setTimeout(function () {
                    $(window).trigger("resize");
                });
            }
        });
    }
    
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
    
    // Not currently used.
    //function getBaseURL() {
    //    var url = location.href;  // entire url including querystring - also: window.location.href;
    //    var baseURL = url.substring(0, url.indexOf('/', 14));


    //    if (baseURL.indexOf('http://localhost') != -1) {
    //        // Base Url for localhost
    //        var url = location.href;  // window.location.href;
    //        var pathname = location.pathname;  // window.location.pathname;
    //        var index1 = url.indexOf(pathname);
    //        var index2 = url.indexOf("/", index1 + 1);
    //        var baseLocalUrl = url.substr(0, index2);

    //        return baseLocalUrl + "/";
    //    }
    //    else {
    //        // Root Url for domain name
    //        return baseURL + "/";
    //    }

    //}

    return learn;
})(Learn || {}, $, _gaq);