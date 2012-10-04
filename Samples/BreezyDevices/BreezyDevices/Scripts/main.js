(function (root) {
    var app = root.app;

    app.logger.info('Breeze Devices is booting');

    ko.applyBindings(app.peopleViewModel, $("content").get(0));

    $(".view").css({ display: 'block' });
}(window));