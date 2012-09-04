define(function(require) {
    var dataservice = require('services/dataservice');
    var backStack = ko.observableArray([]);
    var currentScreen;

    var shell = {
        title: ko.observable(""),
        status: ko.observable(""),
        initialize: function() {
            this.compose('shell', null, "#applicationHost");
            this.navigate('login');
        },
        validationMessages: ko.observable([]),
        showErrors: function() {
            var message = "The following problems were found:\n\n";

            this.validationMessages().forEach(function(item) {
                message += item + "\n";
            });

            alert(message);
        },
        canSave: ko.observable(false),
        save: function() {
            var that = this;
            that.status("Saving...");
            dataservice.saveChanges().then(function() {
                that.status("");
            });
        },
        connectionAction: ko.observable(dataservice.isOffline() ? "Connect" : "Go Offline"),
        toggleConnection: function() {
            dataservice.toggleConnection();

            if (dataservice.isOffline()) {
                this.connectionAction("Connect");
            } else {
                this.connectionAction("Go Offline");
                this.canSave(dataservice.hasChanges());
            }
        },
        canGoBack: ko.computed(function() {
            return backStack().length != 0;
        }),
        goBack: function() {
            var previous = backStack.pop();
            this.compose(previous.name, previous.viewModel, null, function() {
                currentScreen = previous;
            });
        },
        navigate: function(name, viewModel) {
            this.compose(name, viewModel, null, function(newScreen) {
                if (currentScreen) {
                    backStack.push(currentScreen);
                }

                currentScreen = newScreen;
            });
        },
        compose: function(name, viewModel, location, callback) {
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
                    jQuery(location || "#contentHost").empty().append(view);

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
        },
        inspector: ko.observable(null)
    };

    dataservice.onCanSaveChanges(function(value) {
        shell.canSave(value);
    });

    return shell;
});