define(['services/account', 'services/errorhandler'],
    function(account, errorhandler) {

        var self = {
            username: ko.observable("Admin"),
            password: ko.observable("password"),
            loginUser: loginUser
        };

        errorhandler.includeIn(self);

        self.isValid = ko.computed(function () {
            return self.username() && self.password();
        });

        return self;

        function loginUser() {
            if (!self.isValid()) return Q.resolve(false);

            return account.loginUser(self.username(), self.password())
                .then(function() {
                    window.location = '/';
                    return true;
                })
                .fail(self.handleError);
        }
    });