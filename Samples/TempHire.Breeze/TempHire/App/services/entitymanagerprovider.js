define(['durandal/app'],
    function(app) {

        breeze.NamingConvention.camelCase.setAsDefault();
        var serviceName = "api";
        var masterManager = new breeze.EntityManager(serviceName);

        extendEntities(masterManager.metadataStore);

        var EntityManagerProvider = (function() {

            var entityManagerProvider = function() {
                var manager;

                this.manager = function() {
                    if (!manager) {
                        manager = masterManager.createEmptyCopy();

                        // Populate with lookup data
                        manager.importEntities(masterManager.exportEntities());
                        
                        // Subscribe to events
                        manager.hasChangesChanged.subscribe(function(args) {
                            app.trigger('hasChanges');
                        });
                    }

                    return manager;
                };
            };

            return entityManagerProvider;
        })();

        return {
            prepare: prepare,
            create: create
        };

        function create() {
            return new EntityManagerProvider();
        }

        function extendEntities(metadataStore) {
            extendStaffingResource(metadataStore);
            extendAddress(metadataStore);
            extendPhoneNumber(metadataStore);
        }
        
        function extendStaffingResource(metadataStore) {
            var staffingResourceCtor = function () {
                this.id = ko.observable(breeze.core.getUuid());
            };

            staffingResourceCtor.prototype.addAddress = function (typeId) {
                return this.entityAspect.entityManager.createEntity('Address', { addressTypeId: typeId, staffingResourceId: this.id() });
            };

            staffingResourceCtor.prototype.addPhoneNumber = function(typeId) {
                return this.entityAspect.entityManager.createEntity('PhoneNumber', { phoneNumberTypeId: typeId, staffingResourceId: this.id() });
            };

            staffingResourceCtor.prototype.deletePhoneNumber = function (phoneNumber) {
                ensureEntityType(phoneNumber, "PhoneNumber");
                this.throwIfNotOwnerOf(phoneNumber);
                
                phoneNumber.entityAspect.setDeleted();
            };

            staffingResourceCtor.prototype.setPrimaryPhoneNumber = function(phoneNumber) {
                ensureEntityType(phoneNumber, "PhoneNumber");
                this.throwIfNotOwnerOf(phoneNumber);

                ko.utils.arrayForEach(this.phoneNumbers(), function(x) {
                    x.primary(false);
                });

                phoneNumber.primary(true);
            };

            staffingResourceCtor.prototype.deleteAddress = function (address) {
                ensureEntityType(address, "Address");
                this.throwIfNotOwnerOf(address);

                address.entityAspect.setDeleted();
            };

            staffingResourceCtor.prototype.setPrimaryAddress = function(address) {
                ensureEntityType(address, "Address");
                this.throwIfNotOwnerOf(address);

                ko.utils.arrayForEach(this.addresses(), function(x) {
                    x.primary(false);
                });

                address.primary(true);
            };

            staffingResourceCtor.prototype.throwIfNotOwnerOf = function(obj) {
                if (!obj.staffingResourceId || obj.staffingResourceId() !== this.id()) {
                    throw new Error("Object is not associated with current StaffingResource");
                }
            };

            var staffingResourceInitializer = function (staffingResource) {
                staffingResource.fullName = ko.computed(function () {
                    if (staffingResource.middleName()) {
                        return staffingResource.firstName() + " " + staffingResource.middleName() + " " + staffingResource.lastName();
                    }

                    return staffingResource.firstName() + " " + staffingResource.lastName();
                });
            };
            
            metadataStore.registerEntityTypeCtor("StaffingResource", staffingResourceCtor, staffingResourceInitializer);
        }
        
        function extendAddress(metadataStore) {
            var addressCtor = function() {
                this.id = ko.observable(breeze.core.getUuid());
            };

            metadataStore.registerEntityTypeCtor("Address", addressCtor);
        }
        
        function extendPhoneNumber(metadataStore) {
            var phoneNumberCtor = function() {
                this.id = ko.observable(breeze.core.getUuid());
            };

            metadataStore.registerEntityTypeCtor("PhoneNumber", phoneNumberCtor);
        }

        function prepare() {
            var query = breeze.EntityQuery
                .from("Lookups");

            return masterManager.executeQuery(query);
        }
        
        function ensureEntityType(obj, entityTypeName) {
            if (!obj.entityType || obj.entityType.shortName !== entityTypeName) {
                throw new Error("Object must be an entity of type " + entityTypeName);
            }
        }
    });