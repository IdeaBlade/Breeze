define(['durandal/app', 'durandal/activator', 'durandal/system', 'plugins/dialog'],
    function(app, activator, system, dialog) {

        var Dialog = (function () {

            var ctor = function (obj, options) {
                var self = this;

                this.content = activator.create(obj);
                this.commands = ko.observableArray(options);

                this.invokeCommand = function (command) {
                    self.content().dialogResult = command;
                    dialog.close(self, command);
                };
            };

            system.setModuleId(ctor, 'viewmodels/dialog');

            ctor.prototype.activate = function() {
                return this.content.activate();
            };

            ctor.prototype.canDeactivate = function (close) {
                var self = this;
                return this.content.canDeactivate(close)
                    .fin(function() { self.content().dialogResult = null; });
            };

            ctor.prototype.deactivate = function(close) {
                return this.content.deactivate(close);
            };

            return ctor;
        })();

        return {
            show: show
        };

        function show(obj, options) {
            var dlg = new Dialog(obj, options);
            return app.showDialog(dlg);
        }
});