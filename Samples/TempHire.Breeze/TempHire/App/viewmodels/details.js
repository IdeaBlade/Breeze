define(['services/unitofwork', 'logger', 'durandal/system', 'durandal/viewModel', 'viewmodels/contacts', 'durandal/app'],
    function(unitofwork, logger, system, viewModel, contacts, app) {

        return (function() {

            var details = function(id) {
                this.title = 'Details View';
                this.staffingResourceId = id;
                this.staffingResource = ko.observable();
                this.initialized = ko.observable();
                this.canSave = ko.observable(false);
                
                var ref = unitofwork.get(id);
                this.unitOfWork = ref.value();

                this.contacts = viewModel.activator();
            };

            details.prototype.activate = function () {
                // Subscribe to events
                app.on('hasChanges', function() {
                    this.canSave(this.unitOfWork.hasChanges());
                }, this);

                var vm = this;
                return Q.when(this.contacts.activate())
                    .then(function() {
                        if (vm.initialized()) {
                            return true;
                        }

                        return vm.unitOfWork.staffingResources.withId(vm.staffingResourceId)
                            .then(function(data) {
                                vm.staffingResource(data);
                                vm.log("StaffingResource loaded", true);
                                return Q.when(vm.contacts.activateItem(new contacts(vm.staffingResourceId)))
                                    .then(function() {
                                        vm.initialized(true);
                                        return true;
                                    });
                            });
                    })
                    .fail(this.handleError);
            };

            details.prototype.canDeactivate = function (close) {
                var vm = this;
                if (this.unitOfWork.hasChanges() && close) {
                    return Q.when(app.showMessage("You have pending changes. Would you like to save them?", "Confirm", ['Yes', 'No', 'Cancel']))
                        .then(function(response) {
                            if (response === 'Yes') {
                                return vm.unitOfWork.commit()
                                    .then(function() { return true; })
                                    .fail(vm.handleError);
                            }
                            else if (response === 'No') {
                                vm.unitOfWork.rollback();
                                return true;
                            }
                            return false;
                        });
                }

                return true;
            };
            
            details.prototype.deactivate = function(close) {
                app.off(null, null, this);

                if (close) {
                    unitofwork.get(this.staffingResourceId).release();
                    this.initialized(false);
                }

                return this.contacts.deactivate(close);
            };

            details.prototype.save = function () {
                this.unitOfWork.commit().fail(this.handleError);
            };

            details.prototype.cancel = function() {
                this.unitOfWork.rollback();
            };

            details.prototype.handleError = function(error) {
                logger.log(error.message, null, system.getModuleId(this), true);
                throw error;
            };

            details.prototype.log = function(message, showToast) {
                logger.log(message, null, system.getModuleId(this), showToast);
            };

            return details;
        })();
    });