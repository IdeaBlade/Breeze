define(function(require) {
    var dataservice = require('services/dataservice');
    var backStack = ko.observableArray([]);
    var currentScreen;

    return {
        title: ko.observable(""),
        subtitle1: ko.observable(""),
        subtitle2: ko.observable(""),
        commands: ko.observableArray([]),
        status: ko.observable(null),
        addCommand: function(name, execute, canExecute) {
            canExecute = canExecute || function() { return true; };

            this.commands.push({
                name: name,
                execute: function() {
                    if (canExecute()) {
                        execute();
                    }
                },
                canExecute: canExecute
            });
        },
        initialize: function() {
            var that = this;
            ko.compose('shell', null, "#applicationHost", function() {
                that.navigate('login');
            });
        },
        connectionAction: ko.observable(dataservice.isOffline() ? "connect" : "offline"),
        toggleConnection: function() {
            dataservice.toggleConnection();

            if (dataservice.isOffline()) {
                this.connectionAction("connect");
            } else {
                this.connectionAction("offline");
            }
        },
        showHelp: function() {
            alert('not implemented');
        },
        canGoBack: ko.computed(function() {
            return backStack().length != 0;
        }),
        resetHeader: function() {
            this.title("");
            this.subtitle1("");
            this.subtitle2("");
            this.commands.removeAll();
            this.status(null);
        },
        goBack: function() {
            var previous = backStack.pop();
            this.resetHeader();
            ko.compose(previous.name, previous.viewModel, null, function() {
                currentScreen = previous;
            });
        },
        navigate: function(name, viewModel) {
            this.resetHeader();
            ko.compose(name, viewModel, null, function(newScreen) {
                if (currentScreen) {
                    backStack.push(currentScreen);
                }

                currentScreen = newScreen;
            });
        },
        inspector: ko.observable(null)
    };
});