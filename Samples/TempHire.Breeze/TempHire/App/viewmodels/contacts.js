define(['services/unitofwork', 'logger', 'durandal/system'],
    function(unitofwork, logger, system) {

        return (function () {

            var contacts = function(id) {
                this.staffingResourceId = id;
                this.staffingResource = ko.observable();
                this.states = ko.observableArray();

                var ref = unitofwork.get(id);
                this.unitOfWork = ref.value();
            };


            contacts.prototype.activate = function () {
                this.staffingResource(this.unitOfWork.staffingResources.withIdInCache(this.staffingResourceId));
                
                // Load states
                var vm = this;
                var states = this.unitOfWork.states.all()
                    .then(vm.states);

                // Load addresses
                var predicate = breeze.Predicate.create("staffingResourceId", "==", this.staffingResourceId);
                var addresses = this.unitOfWork.addresses.find(predicate);
                
                // Load phone numbers
                var phoneNumbers = this.unitOfWork.phoneNumbers.find(predicate);

                return Q.all([states, addresses, phoneNumbers]).fail(this.handleError);
            };

            contacts.prototype.deactivate = function (close) {
                if (close) {
                    unitofwork.get(this.staffingResourceId).release();
                }

                return true;
            };

            contacts.prototype.handleError = function (error) {
                logger.log(error.message, null, system.getModuleId(this), true);
                throw error;
            };

            contacts.prototype.log = function (message, showToast) {
                logger.log(message, null, system.getModuleId(this), showToast);
            };

            return contacts;
        })();
    });