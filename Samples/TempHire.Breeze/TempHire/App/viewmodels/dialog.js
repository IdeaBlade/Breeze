define(['durandal/app', 'durandal/viewModel', 'durandal/system'],
    function(app, viewModel, system) {

        var Dialog = (function () {

            var ctor = function (obj, options) {
                var self = this;

                this.content = viewModel.activator(obj);
                this.commands = ko.observableArray(options);

                this.invokeCommand = function (command) {
                    self.content().dialogResult = command;
                    self.modal.close(command);
                };
            };

            system.setModuleId(ctor, 'viewmodels/dialog');

            ctor.prototype.activate = function() {
                return this.content.activate();
            };

            ctor.prototype.canDeactivate = function (close) {
                var self = this;
                return Q.when(this.content.canDeactivate(close))
                    .finally(function() { self.content().dialogResult = null; });
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
            var dialog = new Dialog(obj, options);
            return Q.when(app.showModal(dialog));
        }
});