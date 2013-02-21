define(['services/entitymanagerprovider', 'services/repository'],
    function (entityManagerProvider, repository) {

        var refs = {};

        var UnitOfWork = (function () {

            var unitofwork = function () {
                var provider = entityManagerProvider.create();

                this.hasChanges = function() {
                    return provider.manager().hasChanges();
                };
                
                this.commit = function () {
                    return provider.manager().saveChanges();
                };

                this.rollback = function () {
                    provider.manager().rejectChanges();
                };

                this.staffingResourceListItems = repository.create(provider, null, 'ResourceMgt/StaffingResourceListItems');
                this.staffingResources = repository.create(provider, 'StaffingResource', 'ResourceMgt/StaffingResources');
                this.addresses = repository.create(provider, "Address", "ResourceMgt/Addresses");
                this.phoneNumbers = repository.create(provider, "PhoneNumber", "ResourceMgt/PhoneNumbers");

                this.states = repository.create(provider, "State", "States", breeze.FetchStrategy.FromLocalCache);
            };

            return unitofwork;
        })();

        var SmartReference = (function () {

            var ctor = function () {
                var value = null;

                this.referenceCount = 0;

                this.value = function() {
                    if (value === null) {
                        value = new UnitOfWork();
                    }

                    this.referenceCount++;
                    return value;
                };

                this.clear = function() {
                    value = null;
                    this.referenceCount = 0;

                    clean();
                };
            };

            ctor.prototype.release = function () {
                this.referenceCount--;
                if (this.referenceCount === 0) {
                    this.clear();
                }
            };

            return ctor;
        })();

        return {
            create: create,
            get : get
        };
        
        function create() {
            return new UnitOfWork();
        }
        
        function get(key) {
            if (!refs[key]) {
                refs[key] = new SmartReference();
            }

            return refs[key];
        }
        
        function clean() {
            for (key in refs) {
                if (refs[key].referenceCount == 0) {
                    delete refs[key];
                }
            }
        }
    });