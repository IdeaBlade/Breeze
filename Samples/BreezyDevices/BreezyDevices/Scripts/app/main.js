(function (root) {
    var app = root.app;

    app.logger.info('Breeze Devices is booting');

    ko.applyBindings(app.peopleViewModel);

}(window));