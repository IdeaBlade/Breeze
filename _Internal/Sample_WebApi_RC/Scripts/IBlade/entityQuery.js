define(["core", "entityMetadata", "entityAspect"],
function (core, m_entityMetadata, m_entityAspect) {
    "use strict";
    /**
    @module entityModel
    **/

    var Enum = core.Enum;
    var assertParam = core.assertParam;
    
    var MetadataStore = m_entityMetadata.MetadataStore;
    var NavigationProperty = m_entityMetadata.NavigationProperty;

    var EntityAspect = m_entityAspect.EntityAspect;
    var EntityKey = m_entityAspect.EntityKey;
    
    var EntityQuery = (function () {
        /**
        An EntityQuery instance is used to query entities either from a remote datasource or from a local {{#crossLink "EntityManager"}}{{/crossLink}}. 

        EntityQueries are immutable - this means that all EntityQuery methods that return an EntityQuery actually create a new EntityQuery.  This means that 
        EntityQueries can be 'modified' without affecting any current instances.

        @class EntityQuery
        **/
            
        /**
        @example                    
            var query = new EntityQuery("Customers")

        Usually this constructor will be followed by calls to filtering, ordering or selection methods
        @example
            var query = new EntityQuery("Customers")
               .where("CompanyName", "startsWith", "C")
               .orderBy("Region");

        @method <ctor> EntityQuery 
        @param [resourceName] {String}
        **/
        var ctor = function (resourceName) {
            assertParam(resourceName, "resourceName").isOptional().isString().check();
            this.resourceName = normalizeResourceName(resourceName);
            this.entityType = null;
            this.wherePredicate = null;
            this.orderByClause = null;
            this.selectClause = null;
            this.skipCount = null;
            this.takeCount = null;
            this.expandClause = null;
            // default is to get queryOptions from the entityManager.
            this.queryOptions = null;
            this.entityManager = null;                 
        };

        /**
        The resource name used by this query.

        __readOnly__
        @property resourceName {String}
        **/

        /**
        The 'where' predicate used by this query.

        __readOnly__
        @property wherePredicate {Predicate} 
        **/

        /**
        The {{#crossLink "OrderByClause"}}{{/crossLink}} used by this query.

        __readOnly__
        @property orderByClause {OrderByClause}
        **/

        /**
        The number of entities to 'skip' for this query.

        __readOnly__
        @property skipCount {Integer}
        **/

        /**
        The number of entities to 'take' for this query.

        __readOnly__
        @property takeCount {Integer}
        **/

        /**
        The {{#crossLink "QueryOptions"}}{{/crossLink}} for this query.

        __readOnly__
        @property queryOptions {QueryOptions}
        **/
        
        /**
        The {{#crossLink "EntityManager"}}{{/crossLink}} for this query. This may be null and can be set via the 'using' method.

        __readOnly__
        @property entityManager {EntityManager}
        **/

        /*
        Made internal for now.
        @method getEntityType
        @param metadataStore {MetadataStore} The {{#crossLink "MetadataStore"}}{{/crossLink}} in which to locate the 
        {{#crossLink "EntityType"}}{{/crossLink}} returned by this query. 
        @param [throwErrorIfNotFound = false] {Boolean} Whether or not to throw an error if an EntityType cannot be found.
        @return {EntityType|null} Will return a null if the resource has not yet been resolved and throwErrorIfNotFound is false. 
        */
        ctor.prototype._getEntityType = function (metadataStore, throwErrorIfNotFound) {
            assertParam(metadataStore, "metadataStore").isInstanceOf(MetadataStore).check();
            assertParam(throwErrorIfNotFound, "throwErrorIfNotFound").isBoolean().isOptional().check();
            var entityType = this.entityType;
            if (!entityType) {
                var resourceName = this.resourceName;
                if (!resourceName) {
                    throw new Error("There is no resourceName for this query");
                }
                if (metadataStore.isEmpty()) {
                    return null;
                }
                var entityTypeName = metadataStore._getEntityTypeNameForResourceName(resourceName);
                if (!entityTypeName) {
                    if (throwErrorIfNotFound) {
                        throw new Error("Cannot find resourceName of: " + resourceName);
                    } else {
                        return null;
                    }
                }
                entityType = metadataStore.getEntityType(entityTypeName);
                if (!entityType) {
                    if (throwErrorIfNotFound) {
                        throw new Error("Cannot find an entityType for an entityTypeName of: " + entityTypeName);
                    } else {
                        return null;
                    }
                }
                this.entityType = entityType;
            }
            return entityType;
        };

        /**
        Specifies the resource to query for this EntityQuery.
        @example                    
            var query = new EntityQuery()
                .from("Customers");
        is the same as 
        @example
            var query = new EntityQuery("Customers");
        @method from
        @param resourceName {String} The resource to query.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.from = function (resourceName) {
            // TODO: think about allowing entityType as well 
            assertParam(resourceName, "resourceName").isString().check();
            resourceName = normalizeResourceName(resourceName);
            var currentName = this.resourceName;
            if (currentName && currentName !== resourceName) {
                throw new Error("This query already has an resourceName - the resourceName may only be set once per query");
            }
            var eq = this._clone();
            eq.resourceName = resourceName;
            return eq;
        };
        
        /**
        This is a static version of the "from" method and it creates a 'base' entityQuery for the specified resource name. 
        @example                    
            var query = EntityQuery.from("Customers");
        is the same as 
        @example
            var query = new EntityQuery("Customers");
        @method from
        @static
        @param resourceName {String} The resource to query.
        @return {EntityQuery}
        @chainable
        **/
        ctor.from = function (resourceName) {
            assertParam(resourceName, "resourceName").isString().check();
            return new EntityQuery(resourceName);
        };


        /**
        Adds a filter to the query. Can be called multiple times which means to 'and' with any existing Predicate.
        @example                    
            var query = new EntityQuery("Customers")
                .where("CompanyName", "startsWith", "C");
        This can also be expressed using an explicit {{#crossLink "FilterQueryOp"}}{{/crossLink}} as
        @example
            var query = new EntityQuery("Customers")
                .where("CompanyName", FilterQueryOp.StartsWith, "C");
        or a preconstructed {{#crossLink "Predicate"}}{{/crossLink}} may be used
        @example
            var pred = new Predicate("CompanyName", FilterQueryOp.StartsWith, "C");
            var query = new EntityQuery("Customers")
                .where(pred);
        Predicates are often useful when you want to combine multiple conditions in a single filter, such as
        @example
            var pred = Predicate.create("CompanyName", "startswith", "C").and("Region", FilterQueryOp.Equals, null);
            var query = new EntityQuery("Customers")
                .where(pred);
        @example
        More complicated queries can make use of nested property paths
        @example
            var query = new EntityQuery("Products")
                .where("Category.CategoryName", "startswith", "S");
        or OData functions - A list of valid OData functions can be found within the {{#crossLink "Predicate"}}{{/crossLink}} documentation.
        @example
            var query = new EntityQuery("Customers")
                .where("toLower(CompanyName)", "startsWith", "c");
        or to be even more baroque
        @example
            var query = new EntityQuery("Customers")
               .where("toUpper(substring(CompanyName, 1, 2))", FilterQueryOp.Equals, "OM");
        @method where
        @param predicate {Predicate|property|property path, operator, value} Can be either
        
        - a single {{#crossLink "Predicate"}}{{/crossLink}}

        - or the parameters to create a 'simple' Predicate

            - a property name, a property path with '.' as path seperators or a property expression {String}
            - an operator {FilterQueryOp|String} Either a  {{#crossLink "FilterQueryOp"}}{{/crossLink}} or it's string representation. Case is ignored
            when if a string is provided and any string that matches one of the FilterQueryOp aliases will be accepted.
            - a value    
   
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.where = function (predicate) {
            var eq = this._clone();
            if (arguments.length === 0) {
                eq.wherePredicate = null;
                return eq;
            }
            var pred;
            if (Predicate.isPredicate(predicate)) {
                pred = predicate;
            } else {
                pred = Predicate.create(Array.prototype.slice.call(arguments));
            }
            if (eq.entityType) pred.validate(eq.entityType);
            if (eq.wherePredicate) {
                eq.wherePredicate = new CompositePredicate('and', [eq.wherePredicate, pred]);
            } else {
                eq.wherePredicate = pred;
            }
            return eq;
        };

        /**
        Returns a query that orders the results of the query by property name.  By default sorting occurs is ascending order, but sorting in descending order is supported as well. 
        @example
             var query = new EntityQuery("Customers")
                 .orderBy("CompanyName");

        or to sort across multiple properties
        @example
             var query = new EntityQuery("Customers")
                 .orderBy("Region, CompanyName");

        Nested property paths are also supported
        @example
             var query = new EntityQuery("Products")
                .orderBy("Category.CategoryName");

        Sorting in descending order is supported via the addition of ' desc' to the end of any property path.
        @example
             var query = new EntityQuery("Customers")
                .orderBy("CompanyName desc");

        or
        @example
             var query = new EntityQuery("Customers")
                .orderBy("Region desc, CompanyName desc");
        @method orderBy
        @param propertyPaths {String} A list of property paths seperated by ','. Each property path can optionally end with " desc" to force a descending sort order.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.orderBy = function (propertyPaths) {
            core.assertParam(propertyPaths, "propertyNames").isString();
            // deliberately don't pass in isDesc
            return orderByCore(this, propertyPaths);
        };

        /**
        Returns a query that orders the results of the query by property name in descending order.
        @example
             var query = new EntityQuery("Customers")
                 .orderByDesc("CompanyName");

        or to sort across multiple properties
        @example
             var query = new EntityQuery("Customers")
                 .orderByDesc("Region, CompanyName");

        Nested property paths are also supported
        @example
             var query = new EntityQuery("Products")
                .orderByDesc("Category.CategoryName");

        @method orderByDesc
        @param propertyPaths {String} A list of property paths seperated by ','.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.orderByDesc = function (propertyPaths) {
            core.assertParam(propertyPaths, "propertyNames").isString();
            return orderByCore(this, propertyPaths, true);
        };
        
        /**
        Returns a query that selects a list of properties from the results of the original query and returns the values of just these properties. This
        will be referred to as a projection. 
        If the result of this selection "projection" contains entities, these entities will automatically be added to EntityManager's cache and will 
        be made 'observable'.
        Any simple properties, i.e. strings, numbers or dates within a projection will not be cached are will NOT be made 'observable'.
        
        @example
        Simple data properties can be projected
        @example
            var query = new EntityQuery("Customers")
                .where("CompanyName", "startsWith", "C")
                .select("CompanyName");
        This will return an array of objects each with a single "CompanyName" property of type string.
        A similar query could return a navigation property instead
        @example
            var query = new EntityQuery("Customers")
                .where("CompanyName", "startsWith", "C")
                .select("Orders");
        where the result would be an array of objects each with a single "Orders" property that would itself be an array of "Order" entities.
        Composite projections are also possible:
        @example
            var query = new EntityQuery("Customers")
                .where("CompanyName", "startsWith", "C")
                .select("CompanyName, Orders");
        As well as projections involving nested property paths
        @example
            var query = EntityQuery("Orders")
                .where("Customer.CompanyName", "startsWith", "C")         
                .select("Customer.CompanyName, Customer, OrderDate");
        @method select
        @param propertyPaths {String} A list of property paths seperated by ','.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.select = function (propertyPaths) {
            core.assertParam(propertyPaths, "propertyPaths").isString();
            return selectCore(this, propertyPaths);
        };

        /**
        Returns a query that skips the specified number of entities when returning results.
        @example
            var query = new EntityQuery("Customers")
               .where("CompanyName", "startsWith", "C")
               .skip(5);
        @method skip
        @param count {Number} The number of entities to return. If omitted this clears the 
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.skip = function (count) {
            assertParam(count, "count").isOptional().isNumber().check();
            var eq = this._clone();
            if (arguments.length === 0) {
                eq.skipCount = null;
            } else {
                eq.skipCount = count;
            }
            return eq;
        };
        
        /**
        Returns a query that returns only the specified number of entities when returning results. - Same as 'take'.
        @example
            var query = new EntityQuery("Customers")
                .top(5);
        @method top
        @param count {Number} The number of entities to return.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.top = function(count) {
            return this.take(count);
        };

        /**
        Returns a query that returns only the specified number of entities when returning results - Same as 'top'
        @example
            var query = new EntityQuery("Customers")
                .take(5);
        @method take
        @param count {Number} The number of entities to return.
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.take = function (count) {
            assertParam(count, "count").isOptional().isNumber().check();
            var eq = this._clone();
            if (arguments.length === 0) {
                eq.takeCount = null;
            } else {
                eq.takeCount = count;
            }
            return eq;
        };
        
        /**
        Returns a query that will return related entities nested within its results. The expand method allows you to identify related entities, via navigation property
        names such that a graph of entities may be retrieved with a single request. Any filtering occurs before the results are 'expanded'.
        @example
            var query = new EntityQuery("Customers")
                .where("CompanyName", "startsWith", "C")
                .expand("Orders");
        will return the filtered customers each with its "Orders" properties fully resolved.
        Multiple paths may be specified by separating the paths by a ','
        @example
            var query = new EntityQuery("Orders")
                .expand("Customer, Employee")
        and nested property paths my be specified as well
        @example
            var query = new EntityQuery("Orders")
                .expand("Customer, OrderDetails, OrderDetails.Product")
        @method expand
        @param propertyPaths {String} A comma-separated list of navigation property names. Each Navigation Property name can be followed
        by a '.' and another navigation property name to enable identifying a multi-level relationship
        @return {EntityQuery}
        @chainable
        **/
        ctor.prototype.expand = function (propertyPaths) {
            assertParam(propertyPaths, "propertyPaths").isString().check();
            return expandCore(this, propertyPaths);
        };

         // Implementations found in EntityManager
        /**
        Returns a copy of this EntityQuery with the specified {{#crossLink "EntityManager"}}{{/crossLink}}, {{#crossLink "MergeStrategy"}}{{/crossLink}} 
        or {{#crossLink "FetchStrategy"}}{{/crossLink}} applied.
        @example
        'using' can be used to return a new query with a specified EntityManager.
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders")
                 .using(em);
        or with a specified {{#crossLink "MergeStrategy"}}{{/crossLink}} 
        @example
            var em = new EntityManager(serviceName);
            var query = new EntityQuery("Orders")
                .using(MergeStrategy.PreserveChanges);
        or with a specified {{#crossLink "FetchStrategy"}}{{/crossLink}} 
        @example
            var em = new EntityManager(serviceName);
            var query = new EntityQuery("Orders")
                .using(FetchStrategy.FromLocalCache);
        @example
        @method using
        @param obj {EntityManager|MergeStrategy|FetchStrategy} The object to update in creating a new EntityQuery from an existing one.
        @return {EntityQuery}
        @chainable
        **/
        
        // Implementations found in EntityManager
        /**
        Executes this query.  This method requires that an EntityManager have been previously specified via the "using" method.
        @example
        This method can be called using a 'promises' syntax ( recommended)
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders").using(em);
             query.execute()
               .then( function(data) {
                   ... query results processed here
             }).fail( function(err) {
                   ... query failure processed here
             });
        or with callbacks
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders").using(em);
             query.execute(
                function(data) {
                   var orders = data.results;
                   ... query results processed here
                },
                function(err) {
                   ... query failure processed here
                });
        Either way this method is the same as calling the EntityManager 'execute' method.
        @example
             var em = new EntityManager(serviceName);
             var query = new EntityQuery("Orders");
             em.executeQuery(query)
               .then( function(data) {
                   var orders = data.results;
                   ... query results processed here
             }).fail( function(err) {
                   ... query failure processed here
             });
         
        @method execute
        @async
        
        @param callback {successFunction} Function called on success.
        
           successFunction([data])
           @param [callback.data] {Object} 
           @param [callback.data.results] {Array of Entity}

        @param errorCallback {failureFunction} Function called on failure.
            
        failureFunction([error])
          @param [errorCallback.error] {Error} Any error that occured wrapped into an Error object.
          @return Promise
        **/
        
        /**
        Executes this query against the local cahce.  This method requires that an EntityManager have been previously specified via the "using" method.
        @example
            // assume em is an entityManager already filled with order entities;
            var query = new EntityQuery("Orders").using(em);
            var orders = query.executeLocally();
        
        Note that calling this method is the same as calling {{#crossLink "EntityManager/executeQueryLocally"}}{{/crossLink}}.
      
        @method executeLocally
        **/

        /**
        Static method tht creates an EntityQuery that will allow 'requerying' an entity or a collection of entities by primary key. This can be useful
        to force a requery of selected entities, or to restrict an existing collection of entities according to some filter.
        @example
            // assuming 'customers' is an array of 'Customer' entities retrieved earlier.
            var customersQuery = EntityQuery.fromEntities(customers);
        The resulting query can, of course, be extended
        @example
            // assuming 'customers' is an array of 'Customer' entities retrieved earlier.
            var customersQuery = EntityQuery.fromEntities(customers)
                .where("Region", FilterQueryOp.NotEquals, null);
        Single entities can requeried as well.
        @example
            // assuming 'customer' is a 'Customer' entity retrieved earlier.
            var customerQuery = EntityQuery.fromEntities(customer);
        will create a query that will return an array containing a single customer entity.
        @method fromEntities
        @static
        @param entities {Entity|Array of Entity} The entities for which we want to create an EntityQuery.
        @return {EntityQuery}
        @chainable
        **/
        ctor.fromEntities = function (entities) {
            assertParam(entities, "entities").isEntity().or().isNonEmptyArray().isEntity().check();
            if (!Array.isArray(entities)) {
                entities = Array.prototype.slice.call(arguments);
            }

            var q = new EntityQuery(entities[0].entityType.defaultResourceName);
            var preds = entities.map(function (entity) {
                return buildPredicate(entity);
            });
            var pred = Predicate.or(preds);
            q = q.where(pred);
            return q;
        };

        /**
        Creates an EntityQuery for the specified {{#crossLink "EntityKey"}}{{/crossLink}}.
        @example
            var empType = metadataStore.getEntityType("Employee");
            var entityKey = new EntityKey(empType, 1);
            var query = EntityQuery.fromEntityKey(entityKey);
        or
        @example
            // 'employee' is a previously queried employee
            var entityKey = employee.entityAspect.getKey();
            var query = EntityQuery.fromEntityKey(entityKey);
        @method fromEntityKey
        @static
        @param entityKey {EntityKey} The {{#crossLink "EntityKey"}}{{/crossLink}} for which a query will be created.
        @return {EntityQuery}
        @chainable
        **/
        ctor.fromEntityKey = function (entityKey) {
            assertParam(entityKey, "entityKey").isInstanceOf(EntityKey).check();
            var q = new EntityQuery(entityKey.entityType.defaultResourceName);
            var pred = buildKeyPredicate(entityKey);
            q = q.where(pred);
            return q;
        };

        /**
        Creates an EntityQuery for the specified entity and {{#crossLink "NavigationProperty"}}{{/crossLink}}.
        @example
            // 'employee' is a previously queried employee
            var ordersNavProp = employee.entityType.getProperty("Orders");
            var query = EntityQuery.fromEntityNavigation(employee, ordersNavProp);
        will return a query for the "Orders" of the specified 'employee'.
        @method fromEntityNavigation
        @static
        @param entity {Entity} The Entity whose navigation property will be queried.
        @param navigationProperty {NavigationProperty} The {{#crossLink "NavigationProperty"}}{{/crossLink}} to be queried.
        @return {EntityQuery}
        @chainable
        **/
        ctor.fromEntityNavigation = function (entity, navigationProperty) {
            assertParam(entity, "entity").isEntity().check();
            assertParam(navigationProperty, "navigationProperty").isInstanceOf(NavigationProperty).check();
            var navProperty = entity.entityType._checkNavProperty(navigationProperty);
            var q = new EntityQuery(navProperty.entityType.defaultResourceName);
            var pred = buildNavigationPredicate(entity, navProperty);
            q = q.where(pred);
            return q;
        };


        // protected methods

        ctor.prototype._clone = function () {
            var copy = new EntityQuery();
            copy.resourceName = this.resourceName;
            copy.entityType = this.entityType;
            copy.wherePredicate = this.wherePredicate;
            copy.orderByClause = this.orderByClause;
            copy.selectClause = this.selectClause;
            copy.skipCount = this.skipCount;
            copy.takeCount = this.takeCount;
            copy.expandClause = this.expandClause;
            // default is to get queryOptions from the entityManager.
            copy.queryOptions = this.queryOptions;
            copy.entityManager = this.entityManager;

            return copy;
        };

        // OData QueryOptions - currently supports filter, orderBy, skip, top and expand.
        //        $filter    - done
        //        $select
        //        $orderBy   - done
        //        $top       - done
        //        $skip      - done
        //        $format
        //        $expand    - done
        //        $inlinecount

        ctor.prototype._toUri = function (metadataStore) {
            // force entityType validation;
            this._getEntityType(metadataStore, false);          

            var eq = this;
            var queryOptions = {};
            queryOptions["$filter"] = toFilterString();
            queryOptions["$orderby"] = toOrderByString();
            queryOptions["$skip"] = toSkipString();
            queryOptions["$top"] = toTopString();
            queryOptions["$expand"] = toExpandString();
            queryOptions["$select"] = toSelectString();

            var qoText = toQueryOptionsString();
            return this.resourceName + qoText;

            // private methods to this func.

            function toFilterString() {
                var clause = eq.wherePredicate;
                if (!clause) return "";
                if (eq.entityType) {
                    clause.validate(eq.entityType);
                }
                return clause.toOdataFragment(metadataStore);
            }

            function toOrderByString() {
                var clause = eq.orderByClause;
                if (!clause) return "";
                if (eq.entityType) {
                    clause.validate(eq.entityType);
                }
                return clause.toOdataFragment(metadataStore);
            }
            
             function toSelectString() {
                var clause = eq.selectClause;
                if (!clause) return "";
                if (eq.entityType) {
                    clause.validate(eq.entityType);
                }
                return clause.toOdataFragment(metadataStore);
            }
            
            function toExpandString() {
                var clause = eq.expandClause;
                if (!clause) return "";
                return clause.toOdataFragment(metadataStore);
            }

            function toSkipString() {
                var count = eq.skipCount;
                if (!count) return "";
                return count.toString();
            }

            function toTopString() {
                var count = eq.takeCount;
                if (!count) return "";
                return count.toString();
            }

            function toQueryOptionsString() {
                var qoStrings = [];
                for (var qoName in queryOptions) {
                    var qoValue = queryOptions[qoName];
                    if (qoValue) {
                        qoStrings.push(qoName + "=" + qoValue);
                    }
                }

                if (qoStrings.length > 0) {
                    return "?" + qoStrings.join("&");
                } else {
                    return "";
                }
            }
        };

        ctor.prototype._toFilterFunction = function (metadataStore) {
            var wherePredicate = this.wherePredicate;
            if (!wherePredicate) return null;
            var entityType = this._getEntityType(metadataStore);
            // may throw an exception
            wherePredicate.validate(entityType);
            return wherePredicate.toFunction();
        };

        ctor.prototype._toOrderByComparer = function (metadataStore) {
            var orderByClause = this.orderByClause;
            if (!orderByClause) return null;
            var entityType = this._getEntityType(metadataStore);
            // may throw an exception
            orderByClause.validate(entityType);
            return orderByClause.getComparer();
        };

        // private functions
        
        function normalizeResourceName(resourceName) {
            return resourceName;
//            if (resourceName) {
//                return resourceName.toLowerCase();
//            } else {
//                return undefined;
//            }
        }

        function buildPredicate(entity) {
            var entityType = entity.entityType;
            var predParts = entityType.keyProperties.map(function (kp) {
                return Predicate.create(kp.name, FilterQueryOp.Equals, entity.getProperty(kp.name));
            });
            var pred = Predicate.and(predParts);
            return pred;
        }

        // propertyPaths: can pass in create("A.X,B") or create("A.X desc, B") or create("A.X desc,B", true])
        // isDesc parameter trumps isDesc in propertyName.

        function orderByCore(that, propertyPaths, isDesc) {
            var newClause;
            var eq = that._clone();
            if (!propertyPaths) {
                eq.orderByClause = null;
                return eq;
            }

            newClause = OrderByClause.create(propertyPaths, isDesc);

            if (eq.orderByClause) {
                eq.orderByClause.addClause(newClause);
            } else {
                eq.orderByClause = newClause;
            }
            return eq;
        }
        
        function selectCore(that, propertyPaths) {
            var eq = that._clone();
            if (!propertyPaths) {
                eq.selectClause = null;
                return eq;
            }
            eq.selectClause = new SelectClause(propertyPaths);
            return eq;
        }
        
        function expandCore(that, propertyPaths) {
            var eq = that._clone();
            if (!propertyPaths) {
                eq.expandClause = null;
                return eq;
            }
            eq.expandClause = new ExpandClause(propertyPaths);
            return eq;
        }
        

        function buildKeyPredicate(entityKey) {
            var keyProps = entityKey.entityType.keyProperties;
            var preds = core.arrayZip(keyProps, entityKey.values, function (kp, v) {
                return Predicate.create(kp.name, FilterQueryOp.Equals, v);
            });
            var pred = Predicate.and(preds);
            return pred;
        }

        function buildNavigationPredicate(entity, navigationProperty) {
            if (navigationProperty.isScalar) {
                if (!navigationProperty.foreignKeyNames) return null;
                var relatedKeyValues = navigationProperty.foreignKeyNames.map(function (fkName) {
                    return entity.getProperty(fkName);
                });
                var entityKey = new EntityKey(navigationProperty.entityType, relatedKeyValues);
                return buildKeyPredicate(entityKey);
            } else {
                var inverseNp = navigationProperty.inverse;
                if (!inverseNp) return null;
                var foreignKeyNames = inverseNp.foreignKeyNames;
                if (!foreignKeyNames) return null;
                var keyValues = entity.entityAspect.getKey().values;
                var predParts = core.arrayZip(foreignKeyNames, keyValues, function (fkName, kv) {
                    return Predicate.create(fkName, FilterQueryOp.Equals, kv);
                });
                var pred = Predicate.and(predParts);
                return pred;
            }
        }

        return ctor;
    })();

    var QueryFuncs = (function() {
        var obj = {
            toupper: function(source) { return source.toUpperCase(); },
            tolower: function (source) { return source.toLowerCase(); },
            substring: function(source, pos, length) { return source.substring(pos, length); },   
            substringof: function (source, find) { return source.indexOf(find) >= 0; },
            length:  function(source) { return source.length; },            
            trim: function(source) { return source.trim(); },
            concat: function(s1, s2) { return s1.concat(s2); },
            replace: function (source, find, replace) { return source.replace(find, replace); },
            startswith: function (source, find) { return core.stringStartsWith(source, find); },
            endswith: function (source, find) { return core.stringEndsWith(source, find); },
            indexof: function(source, find) { return source.indexOf(find); },
            round: function(source) { return Math.round(source); },
            ceiling: function(source) {return Math.ceil(source); },
            floor: function (source) { return Math.floor(source); },
            second: function(source) { return source.second;},
            minute: function (source) { return source.minute;},
            day: function(source) { return source.day;},
            month: function(source) { return source.month; },
            year: function(source) { return source.year; }            
        };
        
        return obj;
    })();
    
    var FnNode = (function() {
        // valid property name identifier
        var RX_IDENTIFIER = /^[a-z_][\w.$]*$/i ;
        // comma delimited expressions ignoring commas inside of quotes.
        var RX_COMMA_DELIM1 = /('[^']*'|[^,]+)/g ;
        var RX_COMMA_DELIM2 = /("[^"]*"|[^,]+)/g ;
        
        var ctor = function(source, tokens) {
            var parts = source.split(":");
            if (parts.length == 1) {
                var value = parts[0].trim();
                this.value = value;
                // value is either a string, a quoted string, a number, a bool value, or a date
                // if a string ( not a quoted string) then this represents a property name.
                var firstChar = value.substr(0,1);
                var quoted = firstChar == "'" || firstChar == '"';
                if (quoted) {
                    var unquoted = value.substr(1, value.length - 2);
                    this.fn = function(entity) { return unquoted; };
                } else {
                    var isIdentifier = RX_IDENTIFIER.test(value);
                    if (isIdentifier) {
                        this.propertyPath = value;
                        this.fn = createPropFunction(value);
                    } else {
                        this.fn = function(entity) { return value; };
                    }
                } 
            } else {
                this.fnName = parts[0].trim().toLowerCase();
                this.localFn = QueryFuncs[this.fnName];
                var that = this;
                this.fn = function(entity) {
                    var resolvedNodes = that.fnNodes.map(function(fnNode) {
                        var argVal = fnNode.fn(entity);
                        return argVal;
                    });
                    var val = that.localFn.apply(null, resolvedNodes);
                    return val;
                };
                var argSource = tokens[parts[1]].trim();
                if (argSource.substr(0, 1) == "(") {
                    argSource = argSource.substr(1, argSource.length - 2);
                }
                var commaMatchStr = source.indexOf("'") >= 0 ? RX_COMMA_DELIM1 : RX_COMMA_DELIM2;
                var args = argSource.match(commaMatchStr);
                this.fnNodes = args.map(function(a) {
                    return new FnNode(a, tokens);
                });
            }
        };

        ctor.create = function(source) {
            var regex = /\([^()]*\)/ ;
            var m;
            var tokens = [];
            var i = 0;
            while (m = regex.exec(source)) {
                var token = m[0];
                tokens.push(token);
                var repl = ":" + i++;
                source = source.replace(token, repl);
            }
            var node = new FnNode(source, tokens);
            return node;
        };

        ctor.prototype.toString = function() {
            if (this.fnName) {
                var args = this.fnNodes.map(function(fnNode) {
                    return fnNode.toString();
                });
                var uri = this.fnName + "(" + args.join(",") + ")";
                return uri;
            } else {
                return this.value;
            }
        };

        ctor.prototype.toOdataFragment = function(metadataStore) {
            if (this.fnName) {
                var args = this.fnNodes.map(function(fnNode) {
                    return fnNode.toOdataFragment(metadataStore);
                });                
                var uri = this.fnName + "(" + args.join(",") + ")";
                return uri;
            } else {
                var firstChar = this.value.substr(0, 1);
                if (firstChar === "'" || firstChar === '"') {
                    return this.value;                  
                } else if (this.value == this.propertyPath) {
                    return metadataStore._clientPropertyPathToServer(this.propertyPath);
                } else {
                    return this.value;
                }
            }
        };

        ctor.prototype.validate = function(entityType) {
            // will throw if not found;
            if (this._isValidated) return;            
            this._isValidated = true;
            if (this.propertyPath) {
                entityType.getProperty(this.propertyPath, true);
            } else if (this.fnNodes) {
                this.fnNodes.forEach(function(node) {
                    node.validate(entityType);
                });
            }
        };
        

        return ctor;
    })();
   
    var FilterQueryOp = function () {
        /**
        FilterQueryOp is an 'Enum' containing all of the valid  {{#crossLink "Predicate"}}{{/crossLink}} 
        filter operators for an {{#crossLink "EntityQuery"}}{{/crossLink}}.

        @class FilterQueryOp
        @static
        **/
        var aEnum = new Enum("FilterQueryOp");
        /**
        Aliases: "eq", "=="
        @property Equals {symbol}
        @final
        @static
        **/
        aEnum.Equals = aEnum.addSymbol({ operator: "eq", aliases: ["=="] });
        /**
        Aliases: "ne", "!="
        @property NotEquals {symbol}
        @final
        @static
        **/
        aEnum.NotEquals = aEnum.addSymbol({ operator: "ne", aliases: ["!="] });
        /**
        Aliases: "gt", ">"
        @property GreaterThan {symbol}
        @final
        @static
        **/
        aEnum.GreaterThan = aEnum.addSymbol({ operator: "gt", aliases: [">"] });
        /**
        Aliases: "lt", "<"
        @property LessThan {symbol}
        @final
        @static
        **/
        aEnum.LessThan = aEnum.addSymbol({ operator: "lt", aliases: ["<"] });
        /**
        Aliases: "ge", ">="
        @property GreaterThanOrEqual {symbol}
        @final
        @static
        **/
        aEnum.GreaterThanOrEqual = aEnum.addSymbol({ operator: "ge", aliases: [">="] });
        /**
        Aliases: "le", "<="
        @property LessThanOrEqual {symbol}
        @final
        @static
        **/
        aEnum.LessThanOrEqual = aEnum.addSymbol({ operator: "le", aliases: ["<="] });
        /**
        String operation: Is a string a substring of another string.
        Aliases: "substringof"
        @property Contains {symbol}
        @final
        @static
        **/
        aEnum.Contains = aEnum.addSymbol({ operator: "substringof", isFunction: true });
        /**
        @property StartsWith {symbol}
        @final
        @static
        **/
        aEnum.StartsWith = aEnum.addSymbol({ operator: "startswith", isFunction: true });
        /**
        @property EndsWith {symbol}
        @final
        @static
        **/
        aEnum.EndsWith = aEnum.addSymbol({ operator: "endswith", isFunction: true });
        aEnum.seal();
        aEnum._map = function () {
            var map = {};
            aEnum.getSymbols().forEach(function (s) {
                map[s.name.toLowerCase()] = s;
                map[s.operator.toLowerCase()] = s;
                if (s.aliases) {
                    s.aliases.forEach(function (alias) {
                        map[alias.toLowerCase()] = s;
                    });
                }
            });
            return map;
        } ();
        aEnum.from = function (op) {
            if (aEnum.contains(op)) {
                return op;
            } else {
                return aEnum._map[op.toLowerCase()];
            }
        };
        return aEnum;
    } ();

    var BooleanQueryOp = function () {
        var aEnum = new Enum("BooleanQueryOp");
        aEnum.And = aEnum.addSymbol({ operator: "and", aliases: ["&&"] });
        aEnum.Or = aEnum.addSymbol({ operator: "or", aliases: ["||"] });
        aEnum.Not = aEnum.addSymbol({ operator: "not", aliases: ["~", "!"] });

        aEnum.seal();
        aEnum._map = function () {
            var map = {};
            aEnum.getSymbols().forEach(function (s) {
                map[s.name.toLowerCase()] = s;
                map[s.operator.toLowerCase()] = s;
                if (s.aliases) {
                    s.aliases.forEach(function (alias) {
                        map[alias.toLowerCase()] = s;
                    });
                }
            });
            return map;
        } ();
        aEnum.from = function (op) {
            if (aEnum.contains(op)) {
                return op;
            } else {
                return aEnum._map[op.toLowerCase()];
            }
        };
        return aEnum;
    } ();

    var Predicate = (function () {
        /**  
        Used to define a 'where' predicate for an EntityQuery.  Predicates are immutable, which means that any
        method that would modify a Predicate actually returns a new Predicate. 
        @class Predicate
        **/
        
        /**
        Predicate constructor
        @example
            var p1 = new Predicate("CompanyName", "StartsWith", "B");
            var query = new EntityQuery("Customers").where(p1);
        or 
        @example
            var p2 = new Predicate("Region", FilterQueryOp.Equals, null);
            var query = new EntityQuery("Customers").where(p2);
        @method <ctor> Predicate
        @param property {String} A property name, a nested property name or an expression involving a property name.
        @param operator {FilterQueryOp|String}
        @param value {Object}
        **/
        var ctor = function (propertyOrExpr, operator, value) {
            if (arguments[0].prototype === true) {
                // used to construct prototype
                return this;
            }
            return new SimplePredicate(propertyOrExpr, operator, value);
        };

        /**  
        Returns whether an object is a Predicate
        @example
            var p1 = new Predicate("CompanyName", "StartsWith", "B");
            if (Predicate.isPredicate(p1)) {
                // do something
            }
        @method isPredicate
        @param o {Object}
        @static
        **/
        ctor.isPredicate = function (o) {
            return o instanceof Predicate;
        };

        /**  
        Creates a new 'simple' Predicate.  Note that this method can also take its parameters as an array.
        @example
            var p1 = Predicate.create("Freight", "gt", 100);
        or parameters can be passed as an array.
        @example
            var predArgs = ["Freight", "gt", 100];
            var p1 = Predicate.create(predArgs);
        both of these are the same as 
        @example
            var p1 = new Predicate("Freight", "gt", 100);
        @method create 
        @static
        @param property {String} A property name, a nested property name or an expression involving a property name.
        @param operator {FilterQueryOp|String}
        @param value {Object}
        **/
        ctor.create = function (property, operator, value) {
            if (Array.isArray(property)) {
                return new SimplePredicate(property[0], property[1], property[2]);
            } else {
                return new SimplePredicate(property, operator, value);
            }
        };

        /**  
        Creates a 'composite' Predicate by 'and'ing a set of specified Predicates together.
        @example
            var dt = new Date(88, 9, 12);
            var p1 = Predicate.create("OrderDate", "ne", dt);
            var p2 = Predicate.create("ShipCity", "startsWith", "C");
            var p3 = Predicate.create("Freight", ">", 100);
            var newPred = Predicate.and(p1, p2, p3);
        or
        @example
            var preds = [p1, p2, p3];
            var newPred = Predicate.and(preds);
        @method and
        @param predicates* {multiple Predicates|Array of Predicate}
        @static
        **/
        ctor.and = function (predicates) {
            predicates = argsToPredicates(arguments);
            if (predicates.length === 1) {
                return predicates[0];
            } else {
                return new CompositePredicate("and", predicates);
            }
        };

        /**  
        Creates a 'composite' Predicate by 'or'ing a set of specified Predicates together.
        @example
            var dt = new Date(88, 9, 12);
            var p1 = Predicate.create("OrderDate", "ne", dt);
            var p2 = Predicate.create("ShipCity", "startsWith", "C");
            var p3 = Predicate.create("Freight", ">", 100);
            var newPred = Predicate.or(p1, p2, p3);
        or
        @example
            var preds = [p1, p2, p3];
            var newPred = Predicate.or(preds);
        @method or
        @param predicates* {multiple Predicates|Array of Predicate}
        @static
        **/
        ctor.or = function (predicates) {
            predicates = argsToPredicates(arguments);
            if (predicates.length === 1) {
                return predicates[0];
            } else {
                return new CompositePredicate("or", predicates);
            }
        };

        /**  
        Creates a 'composite' Predicate by 'negating' a specified predicate.
        @example
            var p1 = Predicate.create("Freight", "gt", 100);
            var not_p1 = Predicate.not(p1);
        This can also be accomplished using the 'instance' version of the 'not' method
        @example
            var not_p1 = p1.not();
        Both of which would be the same as
        @example
            var not_p1 = Predicate.create("Freight", "le", 100);
        @method not
        @param predicate {Predicate}
        @static
        **/
        ctor.not = function (predicate) {
            return new CompositePredicate("not", [predicate]);
        };

        /**  
        'And's this Predicate with one or more other Predicates and returns a new 'composite' Predicate
        @example
            var dt = new Date(88, 9, 12);
            var p1 = Predicate.create("OrderDate", "ne", dt);
            var p2 = Predicate.create("ShipCity", "startsWith", "C");
            var p3 = Predicate.create("Freight", ">", 100);
            var newPred = p1.and(p2, p3);
        or
        @example
            var preds = [p2, p3];
            var newPred = p1.and(preds);
        The 'and' method is also used to write "fluent" expressions
        @example
            var p4 = Predicate.create("ShipCity", "startswith", "F")
                .and("Size", "gt", 2000);
        @method and
        @param predicates* {multiple Predicates|Array of Predicate}
        **/
        ctor.prototype.and = function (predicates) {
            predicates = argsToPredicates(arguments);
            predicates.unshift(this);
            return ctor.and(predicates);
        };

        /**  
        'Or's this Predicate with one or more other Predicates and returns a new 'composite' Predicate
        @example
            var dt = new Date(88, 9, 12);
            var p1 = Predicate.create("OrderDate", "ne", dt);
            var p2 = Predicate.create("ShipCity", "startsWith", "C");
            var p3 = Predicate.create("Freight", ">", 100);
            var newPred = p1.and(p2, p3);
        or
        @example
            var preds = [p2, p3];
            var newPred = p1.and(preds);
        The 'or' method is also used to write "fluent" expressions
        @example
            var p4 = Predicate.create("ShipCity", "startswith", "F")
                .or("Size", "gt", 2000);
        @method or
        @param predicates* {multiple Predicates|Array of Predicate}
        **/
        ctor.prototype.or = function (predicates) {
            predicates = argsToPredicates(arguments);
            predicates.unshift(this);
            return ctor.or(predicates);
        };

        /**  
        Returns the 'negated' version of this Predicate
        @example
            var p1 = Predicate.create("Freight", "gt", 100);
            var not_p1 = p1.not();
        This can also be accomplished using the 'static' version of the 'not' method
        @example
            var p1 = Predicate.create("Freight", "gt", 100);
            var not_p1 = Predicate.not(p1);
        which would be the same as
        @example
            var not_p1 = Predicate.create("Freight", "le", 100);
        @method not
        **/
        ctor.prototype.not = function () {
            return new CompositePredicate("not", [this]);
        };

        // methods defined in both subclasses of Predicate

        /**  
        Returns the function that will be used to execute this Predicate against the local cache.
        @method toFunction
        @return {Function}
        **/

        /**  
        Returns a human readable string for this Predicate.
        @method toString
        @return {String}
        **/

        /**  
        Determines whether this Predicate is 'valid' for the specified EntityType; This method will throw an exception
        if invalid.
        @method validate
        @param entityType {EntityType} The entityType to validate against.
        **/

        function argsToPredicates(argsx) {
            if (argsx.length === 1 && Array.isArray(argsx[0])) {
                return argsx[0];
            } else {
                var args = Array.prototype.slice.call(argsx);
                if (Predicate.isPredicate(args[0])) {
                    return args;
                } else {
                    return [Predicate.create(args)];
                }
            }
        }

        return ctor;

    })();

    // Does not need to be exposed.
    var SimplePredicate = (function () {

        var ctor = function (propertyOrExpr, operator, value) {
            assertParam(propertyOrExpr, "propertyOrExpr").isString().check();
            assertParam(operator, "operator").isEnumOf(FilterQueryOp).or().isString().check();
            assertParam(value, "value").isRequired().check();

            this._propertyOrExpr = propertyOrExpr;
            this._fnNode = FnNode.create(propertyOrExpr);
            this._filterQueryOp = FilterQueryOp.from(operator);
            if (!this._filterQueryOp) {
                throw new Error("Unknown query operation: " + operator);
            }
            this._value = value;
        };
        ctor.prototype = new Predicate({ prototype: true });

        ctor.prototype.toOdataFragment = function (metadataStore) {
            var exprFrag = this._fnNode.toOdataFragment(metadataStore);
            var val = formatValue(this._value);
            if (this._filterQueryOp.isFunction) {
                return this._filterQueryOp.operator + "(" + exprFrag + "," + val + ") eq true";
            } else {
                return exprFrag + " " + this._filterQueryOp.operator + " " + val;
            }
        };

        ctor.prototype.toFunction = function () {            
            var predFn = getPredicateFn(this._filterQueryOp, this._value);
            var exprFn = this._fnNode.fn;
            return function(entity) {
                return predFn(makeComparable(exprFn(entity)));
            };
        };

        ctor.prototype.toString = function () {
            var val = formatValue(this._value);
            return this._fnNode.toString() + " " + this._filterQueryOp.operator + " " + val;
        };

        ctor.prototype.validate = function (entityType) {
            // throw if not valid
            this._fnNode.validate(entityType);
        };
        
        // internal functions

        // TODO: still need to handle CacheQueryOptions - string casing, trimming and guids.
        
        function getPredicateFn(filterQueryOp, value) {
            // Date do not compare properly but Date.getTime()'s do.
            if (value instanceof Date) {
                value = value.getTime();
            }
            var predFn;
            switch (filterQueryOp) {
                case FilterQueryOp.Equals:
                    predFn = function (propValue) { return propValue == value; };
                    break;
                case FilterQueryOp.NotEquals:
                    predFn = function (propValue) { return propValue != value; };
                    break;
                case FilterQueryOp.GreaterThan:
                    predFn = function (propValue) { return propValue > value; };
                    break;
                case FilterQueryOp.GreaterThanOrEqual:
                    predFn = function (propValue) { return propValue >= value; };
                    break;
                case FilterQueryOp.LessThan:
                    predFn = function (propValue) { return propValue < value; };
                    break;
                case FilterQueryOp.LessThanOrEqual:
                    predFn = function (propValue) { return propValue <= value; };
                    break;
                case FilterQueryOp.StartsWith:
                    predFn = function (propValue) { return core.stringStartsWith(propValue, value); };
                    break;
                case FilterQueryOp.EndsWith:
                    predFn = function (propValue) { return core.stringEndsWith(propValue, value); };
                    break;
                case FilterQueryOp.Contains:
                    predFn = function (propValue) {
                        return propValue.indexOf(value) >= 0;
                    };
                    break;
                default:
                    throw new Error("Unknown FilterQueryOp: " + filterQueryOp);
                    
            }
            return predFn;
        }

        function formatValue(val) {
            if (typeof val === "string") {
                if (core.isGuid(val)) {
                    return "guid'" + val + "'";
                } else {
                    return "'" + val + "'";
                }
            } else if (core.isDate(val)) {
                // return core.toISODateString(val);
                return "datetime'"+val.toISOString() + "'";
                // return val.toISOString();
            } else {
                return val;
            }
        }

        return ctor;

    })();

    // Does not need to be exposed.
    var CompositePredicate = (function () {

        var ctor = function (booleanOperator, predicates) {
            // if debug
            if (!Array.isArray(predicates)) {
                throw new Error("predicates parameter must be an array");
            }
            // end debug
            if ((this.symbol === "not") && (predicates.length !== 1)) {
                throw new Error("Only a single predicate can be passed in with the 'Not' operator");
            }

            this._booleanQueryOp = BooleanQueryOp.from(booleanOperator);
            if (!this._booleanQueryOp) {
                throw new Error("Unknown query operation: " + booleanOperator);
            }
            this._predicates = predicates;
        };
        ctor.prototype = new Predicate({ prototype: true });

        ctor.prototype.toOdataFragment = function (metadataStore) {
            if (this._predicates.length == 1) {
                return this._booleanQueryOp.operator + " " + "(" + this._predicates[0].toOdataFragment(metadataStore) + ")";
            } else {
                var result = this._predicates.map(function (p) {
                    return "(" + p.toOdataFragment(metadataStore) + ")";
                }).join(" " + this._booleanQueryOp.operator + " ");
                return result;
            }
        };

        ctor.prototype.toFunction = function () {
            return createFunction(this._booleanQueryOp, this._predicates);
        };

        ctor.prototype.toString = function () {
            if (this._predicates.length == 1) {
                return this._booleanQueryOp.operator + " " + "(" + this._predicates[0] + ")";
            } else {
                var result = this._predicates.map(function (p) {
                    return "(" + p.toString() + ")";
                }).join(" " + this._booleanQueryOp.operator + " ");
                return result;
            }
        };

        ctor.prototype.validate = function (entityType) {
            // will throw if not found;
            if (this.isValidated) return;
            this._predicates.every(function (p) {
                p.validate(entityType);
            });
            this._isValidated = true;
        };

        function createFunction(booleanQueryOp, predicates) {
            var func, funcs;
            switch (booleanQueryOp) {
                case BooleanQueryOp.Not:
                    func = predicates[0].toFunction();
                    return function (entity) {
                        return !func(entity);
                    };
                case BooleanQueryOp.And:
                    funcs = predicates.map(function (p) { return p.toFunction(); });
                    return function (entity) {
                        var result = funcs.reduce(function (prev, cur) {
                            return prev && cur(entity);
                        }, true);
                        return result;
                    };
                case BooleanQueryOp.Or:
                    funcs = predicates.map(function (p) { return p.toFunction(); });
                    return function (entity) {
                        var result = funcs.reduce(function (prev, cur) {
                            return prev || cur(entity);
                        }, false);
                        return result;
                    };
                default:
                    throw new Error("Invalid boolean operator:" + booleanQueryOp);
            }
        }

        return ctor;
    })();

    // Not exposed externally for now
    var OrderByClause = (function () {
        /*
        An OrderByClause is a description of the properties and direction that the result 
        of a query should be sorted in.  OrderByClauses are immutable, which means that any
        method that would modify an OrderByClause actually returns a new OrderByClause. 

        For example for an Employee object with properties of 'Company' and 'LastName' the following would be valid expressions:

            var obc = new OrderByClause("Company.CompanyName, LastName") 
                or 
            var obc = new OrderByClause("Company.CompanyName desc, LastName") 
                or 
            var obc = new OrderByClause("Company.CompanyName, LastName", true);
        @class OrderByClause
        */
        
        /*
        @method <ctor> OrderByClause
        @param propertyPaths {String} A ',' delimited string of 'propertyPaths'. Each substring of the 'propertyPaths' 
        parameter should be a valid property name or property path for the EntityType of the query associated with this clause. 
        @param [isDesc=false] {Boolean}
        */
        var ctor = function (propertyPaths, isDesc) {
            if (propertyPaths.prototype === true) {
                // used to construct prototype
                return this;
            }
            return ctor.create(propertyPaths, isDesc);
        };

        /*
        Alternative method of creating an OrderByClause. 
        Example for an Employee object with properties of 'Company' and 'LastName': 

            var obc = OrderByClause.create("Company.CompanyName, LastName") 
                or 
            var obc = OrderByClause.create("Company.CompanyName desc, LastName") 
                or 
            var obc = OrderByClause.create("Company.CompanyName, LastName", true);
        @method create 
        @static
        @param propertyPaths {String} A ',' delimited string of 'propertyPaths'. Each substring of the 'propertyPaths' 
        parameter should be a valid property name or property path for the EntityType of the query associated with this clause. 
        @param [isDesc=false] {Boolean}
        */
        ctor.create = function (propertyPaths, isDesc) {
            if (typeof (propertyPaths) !== 'string') {
                throw new Error("The propertyPaths parameter must be a string.");
            }
            var pathStrings = propertyPaths.split(",");
            if (pathStrings.length > 1) {
                var clauses = pathStrings.map(function (pp) {
                    return new SimpleOrderByClause(pp, isDesc);
                });
                return new CompositeOrderByClause(clauses);
            } else {
                return new SimpleOrderByClause(pathStrings[0], isDesc);
            }
        };

        /*
        Returns a 'composite' OrderByClause by combining other OrderByClauses.
        @method combine
        @static
        @param orderByClauses {Array of OrderByClause}
        */
        ctor.combine = function (orderByClauses) {
            return new CompositeOrderByClause(orderByClauses);
        };

        /*
        Returns whether an object is an OrderByClause.
        @method isOrderByClause
        @static
        @param obj {Object}
        */
        ctor.isOrderByClause = function (obj) {
            return obj instanceof OrderByClause;
        };

        /*
        Returns whether a new OrderByClause with a specified clause add to the end of this one. 
        @method addClause
        @param orderByClause {OrderByClause}
        */
        ctor.prototype.addClause = function (orderByClause) {
            return new CompositeOrderByClause([this, orderByClause]);
        };

        return ctor;
    })();

    // Does not need to be exposed.
    var SimpleOrderByClause = (function () {

        var ctor = function (propertyPath, isDesc) {
            if (!typeof propertyPath == 'string') {
                throw new Error("propertyPath is not a string");
            }
            propertyPath = propertyPath.trim();

            var properties = propertyPath.split(' ');
            // parts[0] is the propertyPath; [1] would be whether descending or not.
            if (properties.length > 1 && isDesc !== true && isDesc !== false) {
                isDesc = core.stringStartsWith(properties[1].toLowerCase(), "desc");
                if (!isDesc) {
                    var isAsc = core.stringStartsWith(properties[1].toLowerCase(), "asc");
                    if (!isAsc) {
                        throw new Error("the second word in the propertyPath must begin with 'desc' or 'asc'");
                    }
                    isDesc = !isAsc;
                }
            }
            this.propertyPath = properties[0];
            this.isDesc = isDesc;
            this.properties = properties;
        };
        ctor.prototype = new OrderByClause({ prototype: true });

        ctor.prototype.validate = function (entityType) {
            if (!entityType) {
                return;
            } // can't validate yet
            // will throw an exception on bad propertyPath
            entityType.getProperty(this.propertyPath, true);
        };

        ctor.prototype.toOdataFragment = function (metadataStore) {
            return metadataStore._clientPropertyPathToServer(this.propertyPath) + (this.isDesc ? " desc" : "");
            // return this.propertyPath.replace(".", "/") + (this.isDesc ? " desc" : "");
        };

        ctor.prototype.getComparer = function () {
            var properties = this.properties;
            var isDesc = this.isDesc;
            return function (entity1, entity2) {
                var value1 = makeComparable(getPropertyPathValue(entity1, properties));
                var value2 = makeComparable(getPropertyPathValue(entity2, properties));
                if (value1 == value2) {
                    return 0;
                } else if (value1 > value2) {
                    return isDesc ? -1 : 1;
                } else {
                    return isDesc ? 1 : -1;
                }
            };
        };


        return ctor;
    })();

    // Does not need to be exposed.
    var CompositeOrderByClause = (function () {
        var ctor = function (orderByClauses) {
            var resultClauses = [];
            orderByClauses.forEach(function (obc) {
                if (obc instanceof CompositeOrderByClause) {
                    resultClauses = resultClauses.concat(obc.orderByClauses);
                } else if (obc instanceof SimpleOrderByClause) {
                    resultClauses.push(obc);
                } else {
                    throw new Error("Invalid argument to CompositeOrderByClause ctor.");
                }
            });
            this._orderByClauses = resultClauses;

        };
        ctor.prototype = new OrderByClause({ prototype: true });


        ctor.prototype.validate = function (entityType) {
            this._orderByClauses.forEach(function (obc) {
                obc.validate(entityType);
            });
        };

        ctor.prototype.toOdataFragment = function (metadataStore) {
            var strings = this._orderByClauses.map(function (obc) {
                return obc.toOdataFragment(metadataStore);
            });
            // should return something like CompanyName,Address/City desc
            return strings.join(',');
        };

        ctor.prototype.getComparer = function () {
            var orderByFuncs = this._orderByClauses.map(function (obc) {
                return obc.getComparer();
            });
            return function (entity1, entity2) {
                for (var i = 0; i < orderByFuncs.length; i++) {
                    var result = orderByFuncs[i](entity1, entity2);
                    if (result != 0) {
                        return result;
                    }
                }
                return 0;
            };
        };
        return ctor;
    })();
    
    // Not exposed
    var SelectClause = (function () {
        
        var ctor = function (propertyPaths) {
            assertParam(propertyPaths, "propertyPaths").isString().check();
            this.propertyPaths = propertyPaths;
            this._pathStrings = propertyPaths.split(",").map(function(pp) {
                return pp.trim();
            });
        };

        ctor.prototype.validate = function (entityType) {
            if (!entityType) {
                return;
            } // can't validate yet
            // will throw an exception on bad propertyPath
            this._pathStrings.forEach(function(path) {
                entityType.getProperty(path, true);
            });
         };

         ctor.prototype.toOdataFragment = function(metadataStore) {
             var frag = this._pathStrings.map(function(pp) {
                 return metadataStore._clientPropertyPathToServer(pp);
             }).join(",");
             return frag;
         };

         return ctor;
    })();
    
     // Not exposed
    var ExpandClause = (function () {
        
        var ctor = function (propertyPaths) {
            this.propertyPaths = propertyPaths;
            this._pathStrings = propertyPaths.split(",").map(function(pp) {
                return pp.trim();
            });
        };
       
//        // TODO:
//        ctor.prototype.validate = function (entityType) {
//            
//        };

        ctor.prototype.toOdataFragment = function(metadataStore) {
            var frag = this._pathStrings.map(function(pp) {
                return metadataStore._clientPropertyPathToServer(pp);
            }).join(",");
            return frag;
        };

        return ctor;
    })();
    

    // propertyPath can be either an array of paths or a '.' delimited string.
    
    function createPropFunction(propertyPath) {
        var properties = propertyPath.split('.');
        if (properties.length === 1) {
            return function(entity) {
                return entity.getProperty(propertyPath);
            };
        } else {
            return function(entity) {
                return getPropertyPathValue(entity, properties);
            };
        }
    }

    function getPropertyPathValue(obj, propertyPath) {
        var properties;
        if (Array.isArray(propertyPath)) {
            properties = propertyPath;
        } else {
            properties = propertyPath.split(".");
        }
        if (properties.length === 1) {
            return obj.getProperty(propertyPath);
        } else {
            var nextValue = obj;
            for (var i = 0; i < properties.length; i++) {
                nextValue = nextValue.getProperty(properties[i]);
                // == in next line is deliberate - checks for undefined or null.
                if (nextValue == null) {
                    break;
                }
            }
            return nextValue;
        }
    }

    function makeComparable(value) {
        // dates don't perform equality comparisons properly 
        if (value instanceof Date) {
            return value.getTime();
        } else {
            return value;
        }
    }

    // Fixup --- because EntityAspect does not have access to EntityQuery or EntityMetadata

    EntityAspect.prototype.loadNavigationProperty = function (navigationProperty, callback, errorCallback) {
        var entity = this.entity;
        var navProperty = entity.entityType._checkNavProperty(navigationProperty);
        var query = EntityQuery.fromEntityNavigation(entity, navProperty, callback, errorCallback);
        return entity.entityAspect.entityManager.executeQuery(query, callback, errorCallback);
    };

    // expose
    // do not expose SimplePredicate and CompositePredicate 
    // Note: FnNode only exposed for testing purposes
    return {
        FilterQueryOp: FilterQueryOp,
        Predicate: Predicate,
        EntityQuery: EntityQuery,
        FnNode: FnNode,
        // Not documented - only exposed for testing purposes
        OrderByClause: OrderByClause
    };
});