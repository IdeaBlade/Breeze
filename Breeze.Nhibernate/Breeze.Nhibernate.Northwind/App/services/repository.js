define(['services/errorhandler'],
    function (errorhandler) {

    var Repository = (function () {

        var repository = function (entityManagerProvider, entityTypeName, resourceName, fetchStrategy) {

            var self = this;
            errorhandler.includeIn(this);

            // Ensure resourceName is registered
            var entityType;
            if (entityTypeName) {
                entityType = getMetastore().getEntityType(entityTypeName);
                entityType.setProperties({ defaultResourceName: resourceName });

                getMetastore().setEntityTypeForResourceName(resourceName, entityTypeName);
            }

            this.createEntity = function (config) {
                return manager().createEntity(entityTypeName, config);
            }

            this.withId = function (key) {
                if (!entityTypeName)
                    throw new Error("Repository must be created with an entity type specified");

                return manager().fetchEntityByKey(entityTypeName, key, true)
                    .then(function (data) {
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

            this.where = function (field, op, val) {
                var query = breeze.EntityQuery
                    .from(resourceName)
                    .where(field, op, val);

                return executeQuery(query);
            };

            this.query = function () {
                var query = breeze.EntityQuery
                    .from(resourceName)
                    .using(entityManagerProvider.manager());

                return query;
            };

            this.findInCache = function (predicate) {
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
                    .then(function (data) { return data.results; })
                    .fail(function (error) { self.handleError(error); });
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