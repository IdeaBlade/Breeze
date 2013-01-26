$(function () {
    var getValidationSummaryErrors = function ($form) {
        var errorSummary = $form.find('.validation-summary-errors, .validation-summary-valid');
        return errorSummary;
    };

    var displayErrors = function (form, errors) {
        var errorSummary = getValidationSummaryErrors(form)
            .removeClass('validation-summary-valid')
            .addClass('validation-summary-errors');

        var items = $.map(errors, function (error) {
            return '<li>' + error + '</li>';
        }).join('');

        errorSummary.find('ul').empty().append(items);
    };

    var formSubmitHandler = function (e) {
        var $form = $(this);

        // We check if jQuery.validator exists on the form
        if (!$form.valid || $form.valid()) {
            $.post($form.attr('action'), $form.serializeArray())
                .done(function (json) {
                    json = json || {};

                    // In case of success, we redirect to the provided URL or the same page.
                    if (json.success) {
                        window.location = json.redirect || location.href;
                    } else if (json.errors) {
                        displayErrors($form, json.errors);
                    }
                })
                .error(function () {
                    displayErrors($form, ['An unknown error happened.']);
                });
        }

        // Prevent the normal behavior since we opened the dialog
        e.preventDefault();
    };

    $("#showRegister").click(function () {
        $("#loginPanel").hide("slide", function () {
            $("#registerPanel").show("slide", function () {
                $("#registerName").focus();
            });
        });
    });

    $("#showLogin").click(function () {
        $("#registerPanel").hide("slide", function () {
            $("#loginPanel").show("slide", function () {
                $("#loginName").focus();
            });
        });
    });

    $("#loginForm").submit(formSubmitHandler);
    $("#registerForm").submit(formSubmitHandler);
});