define(['services/unitofwork', 'logger', 'durandal/system', 'viewmodels/dialog', 'viewmodels/optionselector'],
    function(unitofwork, logger, system, dialog, optionselector) {

        var Contacts = (function () {

            var ctor = function(id) {
                var self = this;

                this.staffingResourceId = id;
                this.staffingResource = ko.observable();
                this.states = ko.observableArray();

                var ref = unitofwork.get(id);
                this.unitOfWork = ref.value();

                this.addAddress = function() {
                    self.unitOfWork.addressTypes.all()
                        .then(function(data) {
                            var selector = optionselector.create('Select address type: ', data, 'displayName', 'id');
                            return dialog.show(selector, ['Ok', 'Cancel'])
                                .then(function(response) {
                                    if (response === 'Ok') {
                                        self.staffingResource().addAddress(selector.selectedValue());
                                    }
                                });
                        })
                        .fail(self.handleError);
                };

                this.addPhoneNumber = function () {
                    self.unitOfWork.phoneNumberTypes.all()
                        .then(function(data) {
                            var selector = optionselector.create('Select phone type: ', data, 'name', 'id');
                            return dialog.show(selector, ['Ok', 'Cancel'])
                                .then(function(response) {
                                    if (response === 'Ok') {
                                        self.staffingResource().addPhoneNumber(selector.selectedValue());
                                    }
                                });
                        })
                        .fail(self.handleError);
                };

                this.deletePhoneNumber = function (phoneNumber) {
                    if (phoneNumber.primary() || self.staffingResource().phoneNumbers.length === 1) return;

                    self.staffingResource().deletePhoneNumber(phoneNumber);
                };

                this.setPrimaryPhoneNumber = function(phoneNumber) {
                    if (phoneNumber.primary()) return;

                    self.staffingResource().setPrimaryPhoneNumber(phoneNumber);
                };

                this.deleteAddress = function(address) {
                    if (address.primary() || self.staffingResource().addresses.length === 1) return;

                    self.staffingResource().deleteAddress(address);
                };

                this.setPrimaryAddress = function (address) {
                    if (address.primary()) return;

                    self.staffingResource().setPrimaryAddress(address);
                };
            };

            system.setModuleId(ctor, 'viewmodels/contacts');

            ctor.prototype.activate = function () {
                var root = this.unitOfWork.staffingResources.withId(this.staffingResourceId)
                    .then(this.staffingResource);
                
                // Load states
                var vm = this;
                var states = this.unitOfWork.states.all()
                    .then(vm.states);

                // Load addresses
                var predicate = breeze.Predicate.create("staffingResourceId", "==", this.staffingResourceId);
                var addresses = this.unitOfWork.addresses.find(predicate);
                
                // Load phone numbers
                var phoneNumbers = this.unitOfWork.phoneNumbers.find(predicate);

                return Q.all([root, states, addresses, phoneNumbers]).fail(this.handleError);
            };

            ctor.prototype.deactivate = function (close) {
                if (close) {
                    unitofwork.get(this.staffingResourceId).release();
                }

                return true;
            };

            ctor.prototype.handleError = function (error) {
                logger.log(error.message, null, system.getModuleId(this), true);
                throw error;
            };

            ctor.prototype.log = function (message, showToast) {
                logger.log(message, null, system.getModuleId(this), showToast);
            };

            return ctor;
        })();

        return {
            create: create
        };
        
        function create(id) {
            return new Contacts(id);
        }
    });