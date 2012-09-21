define(function(require) {
    var dataservice = require('services/dataservice');
    var backStack = ko.observableArray([]);
    var currentScreen;

    var shell = {
        title: ko.observable(""),
        subtitle1:ko.observable(""),
        subtitle2:ko.observable(""),
        initialize: function() {
            ko.compose('shell', null, "#applicationHost", function() {
                shell.navigate('login');
            });
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
            ko.compose(previous.name, previous.viewModel, null, function() {
                currentScreen = previous;
            });
        },
        navigate: function(name, viewModel) {
            ko.compose(name, viewModel, null, function(newScreen) {
                if (currentScreen) {
                    backStack.push(currentScreen);
                }

                currentScreen = newScreen;
            });
        },
        inspector: ko.observable(null)
    };

    shell.showSaved = ko.computed(function() {
        return this.canSave() && this.validationMessages().length == 0 && this.connectionAction() == 'Go Offline';
    }, shell);

    dataservice.onCanSaveChanges(shell.canSave);

    return shell;
});