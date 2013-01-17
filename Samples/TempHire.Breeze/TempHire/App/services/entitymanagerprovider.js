define(['durandal/app'],
    function(app) {

        breeze.NamingConvention.camelCase.setAsDefault();
        var serviceName = "api/ResourceMgt";
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
            var staffingResourceInitializer = function(staffingResource) {
                staffingResource.fullName = ko.computed(function() {
                    if (staffingResource.middleName()) {
                        return staffingResource.firstName() + " " + staffingResource.middleName() + " " + staffingResource.lastName();
                    }

                    return staffingResource.firstName() + " " + staffingResource.lastName();
                });
            };
            metadataStore.registerEntityTypeCtor("StaffingResource", null, staffingResourceInitializer);
        }

        function prepare() {
            var query = breeze.EntityQuery
                .from("Lookups");

            return masterManager.executeQuery(query);
        }
    });