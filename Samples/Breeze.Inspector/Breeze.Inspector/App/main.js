requirejs.config({
    // well-known paths to selected scripts
    paths:{
        'breeze':'lib/breeze.debug', // debug version of breeze
        'text':'lib/text'// html loader plugin; see http://requirejs.org/docs/api.html#text
    }
});

define(['text', 'breeze'], function() {
    ko.bindingHandlers.behavior = {
        init: function(element, valueAccessor, allBindingsAccessor, viewModel) {
            var behaviorType = valueAccessor();

            require(["behaviors/" + behaviorType], function(behavior) {
                behavior.attach(element, viewModel);
            });
        }
    };

    ko.compose = function(name, viewModel, location, callback, replace) {
        var dependencies = ['text!views/' + name + '.html'];

        if (!viewModel) {
            dependencies.push('viewmodels/' + name);
        }

        require(dependencies, function(html, module) {
            var finalViewModel = viewModel || module;

            //give the browser time to update
            setTimeout(function() {
                var view = jQuery(html);
                ko.applyBindings(finalViewModel, view.get(0));

                if (replace) {
                    jQuery(location).replaceWith(view);
                } else {
                    jQuery(location || "#contentHost").empty().append(view);
                }
                
                if (finalViewModel.activate) {
                    finalViewModel.activate();
                }

                if (callback) {
                    callback({
                        name: name,
                        viewModel: finalViewModel
                    });
                }
            }, 1);
        });
    };

    require(['services/dataservice', 'viewmodels/shell'], function(data, shell) {
        data.ready().then(function() { shell.initialize(); });
    });
});