define(function(require) {
    var data = require('services/dataservice'),
        shell = require('viewmodels/shell');

    var loginMessage = "Logging in...";

    var vm = {
        username: ko.observable(''),
        password: ko.observable(''),
        message: ko.observable(''),
        activate: function() {
            shell.title("Breeze Inspector - Login");
        },
        login: function() {
            vm.message(loginMessage);

            data.login(this.username(), this.password()).then(function(response) {
                if (response.results.length != 1) {
                    vm.message("Invalid credentials provided.");
                    return;
                }

                shell.inspector(response.results[0]);
                shell.compose('joblist');
            });
        }
    };

    vm.canLogin = ko.computed(function() {
        return this.username().length > 0 && this.password().length > 0 && this.message() != loginMessage;
    }, vm);

    return vm;
});