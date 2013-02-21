define(function() {

    var Repository = (function () {
        
        var repository = function (entityManagerProvider, entityTypeName, resourceName, fetchStrategy) {
            
            // Set resourceName as the defaultResourceName for the specified entityType
            var entityType;
            if (entityTypeName) {
                entityType = getMetastore().getEntityType(entityTypeName);
                entityType.defaultResourceName = resourceName;
            }

            this.withId = function (key) {
                if (!entityTypeName)
                    throw new Error("Repository must be created with an entity type specified");

                return manager().fetchEntityByKey(entityTypeName, key, true)
                    .then(function(data) {
                        if (!data.entity)
                            throw new Error("Entity not found!");
                        return data.entity;
                    });
            };
            
            this.find = function (predicate) {
                var query = breeze.EntityQuery
                    .from(resourceName)
                    .where(predicate);

                return executeQuery(query);
            };

            this.findInCache = function(predicate) {
                var query = breeze.EntityQuery
                    .from(resourceName)
                    .where(predicate);

                return executeCacheQuery(query);
            };

            this.all = function () {
                var query = breeze.EntityQuery
                    .from(resourceName);

                return executeQuery(query);
            };

            function executeQuery(query) {
                return entityManagerProvider.manager()
                    .executeQuery(query.using(fetchStrategy || breeze.FetchStrategy.FromServer))
                    .then(function(data) { return data.results; });
            }
            
            function executeCacheQuery(query) {
                return entityManagerProvider.manager().executeQueryLocally(query);
            }
            
            function getMetastore() {
                return manager().metadataStore;
            }
            
            function manager() {
                return entityManagerProvider.manager();
            }
        };

        return repository;
    })();

    return {
        create: create
    };
    
    function create(entityManagerProvider, entityTypeName, resourceName, fetchStrategy) {
        return new Repository(entityManagerProvider, entityTypeName, resourceName, fetchStrategy);
    }
});