define(function() {

    var Repository = (function () {
        
        var repository = function (entityManagerProvider, entityTypeName, entitySetName, fetchStrategy) {

            this.withId = function (key) {
                var entityType = entityManagerProvider.manager().metadataStore.getEntityType(entityTypeName);
                var entityKey = new breeze.EntityKey(entityType, key);
                var query = breeze.EntityQuery.fromEntityKey(entityKey);

                return executeQuery(query)
                    .then(function(data) { return data[0]; });
            };
            
            this.withIdInCache = function(key) {
                var entityType = entityManagerProvider.manager().metadataStore.getEntityType(entityTypeName);
                var entityKey = new breeze.EntityKey(entityType, key);
                var query = breeze.EntityQuery.fromEntityKey(entityKey);

                return executeCacheQuery(query)[0];
            };

            this.find = function (predicate) {
                var query = breeze.EntityQuery
                    .from(entitySetName)
                    .where(predicate);

                return executeQuery(query);
            };

            this.findInCache = function(predicate) {
                var query = breeze.EntityQuery
                    .from(entitySetName)
                    .where(predicate);

                return executeCacheQuery(query);
            };

            this.all = function () {
                var query = breeze.EntityQuery
                    .from(entitySetName);

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
        };

        return repository;
    })();

    return {
        create: create
    };
    
    function create(entityManagerProvider, entityTypeName, entitySetName, fetchStrategy) {
        return new Repository(entityManagerProvider, entityTypeName, entitySetName, fetchStrategy);
    }
});