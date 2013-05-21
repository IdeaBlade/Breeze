define([],
    function() {

        var self = {
            loginUser: loginUser
        };

        return self;

        function loginUser(username, password) {
            var data = {
                username: username,
                password: password
            };

            return Q.when($.ajax({
                url: '/breeze/account/login',
                type: 'POST',
                contentType: 'application/json',
                dataType: 'json',
                data: JSON.stringify(data)
            })).fail(handleError);
        }

        function handleError(response) {
            var error = JSON.parse(response.responseText);
            throw new Error(error.ExceptionMessage);
        }
    });