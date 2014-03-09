//#region Copyright, Version, and Description
/*
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.  
 * Use, reproduction, distribution, and modification of this code is subject to the terms and 
 * conditions of the IdeaBlade Breeze license, available at http://www.breezejs.com/license
 *
 * Author: Ward Bell
 * Version: 0.9.0
 * --------------------------------------------------------------------------------
 * Adds getEntityGraph method to Breeze EntityManager and EntityManager prototype
 * Source:
 * https://github.com/IdeaBlade/Breeze/blob/master/Breeze.Client/Scripts/Labs/breeze.getEntityGraph.js
 *
 * Depends on Breeze which it patches
 *
 * For discussion, see:
 * http://www.breezejs.com/documentation/getentitygraph 
 *  
 * For example usage, see:
 * https://github.com/IdeaBlade/Breeze/blob/master/Samples/DocCode/DocCode/tests/getEntityGraphTests.js  
 */
//#endregion
(function (definition, window) {
    if (window.breeze) {
        definition(window.breeze);
    } else if (typeof require === "function" && typeof exports === "object" && typeof module === "object") {
        // CommonJS or Node
        var b = require('breeze');
        definition(b);
    } else if (typeof define === "function" && define["amd"] && !window.breeze) {
        // Requirejs / AMD 
        define(['breeze'], definition);
    } else {
        throw new Error("Can't find breeze");
    }
}(function (breeze) {

    var EntityManager = breeze.EntityManager;
    var proto = EntityManager.prototype;

    if (!EntityManager.getEntityGraph){
        /**
        Get related entities of root entity (or root entities) as specified by expand. 
        @example
            var results = breeze.EntityManager.getEntityGraph(customer, 'Orders.OrderDetails');
            // results will be the customer, all of its orders and their details even if deleted.
        @method getEntityGraph
        @param roots {Entity|Array of Entity} The root entity or root entities.
        @param expand {String|Array of String|Object} an expand string, a query expand clause, or array of string paths
        @return {Array of Entity} root entities and their related entities, including deleted entities;
        **/
        EntityManager.getEntityGraph = getEntityGraphCore;
    }

    if (!proto.getEntityGraph) {
        /**
        Execute query locally and return both the query results and their related entities as specified by the optional expand parameter or the query's expand clause. 
        @example
            var query = breeze.EntityQuery.from('Customers')
                        .where('CompanyName', 'startsWith', 'Alfred')
                        .expand('Orders.OrderDetails');
            var results = manager.getEntityGraph(query);
            // results will be the 'Alfred' customers, their orders and their details even if deleted.
        @method getEntityGraph
        @param query {EntityQuery} A query to be executed against the manager's local cache.
        @param [expand] {String|Array of String|Object} an expand string, a query expand clause, or array of string paths
        @return {Array of Entity} local queried root entities and their related entities, including deleted entities;
        **/

        /**
        Get related entities of root entity (or root entities) as specified by expand. 
        @example
            var results = manager.getEntityGraph(customer, 'Orders.OrderDetails');
            // results will be the customer, all of its orders and their details even if deleted.
        @method getEntityGraph
        @param roots {Entity|Array of Entity} The root entity or root entities.
        @param expand {String|Array of String|Object} an expand string, a query expand clause, or array of string paths
        @return {Array of Entity} root entities and their related entities, including deleted entities;
        **/
        proto.getEntityGraph = getEntityGraph;
    }

    function getEntityGraph(roots, expand) {
        if (roots instanceof breeze.EntityQuery) {
            var newRoots = this.executeQueryLocally(roots);
            return getEntityGraphCore(newRoots, expand || roots.expandClause);
        } else {
            return getEntityGraphCore(roots, expand);
        }
    }

    function getEntityGraphCore(roots, expand) {
        var entityGroupMap, rootType;
        roots = Array.isArray(roots) ? roots : [roots];
        if (!roots.length) { return []; }
        getRootInfo();
        var expandFns = getExpandFns();
        var results = roots.slice();
        expandFns.forEach(function (fn) { fn(roots); });
        return results;

        function getRootInfo() {
            roots.forEach(function (root, ix) {
                var aspect;
                var getRootErr = function (msg) {
                    return new Error("'getEntityGraph' root[" + ix + "] " + msg);
                };

                if (!root || !(aspect = root.entityAspect)) {
                    throw getRootErr('is not an entity');
                }
                if (aspect.entityState === breeze.EntityState.Detached) {
                    throw getRootErr('is a detached entity');
                }
                if (rootType) {
                    if (rootType !== root.entityType) {
                        throw getRootErr("has a different 'EntityType' than other roots");
                    }
                } else {
                    rootType = root.entityType;
                }

                var em = aspect.entityManager;
                if (entityGroupMap) {
                    if (entityGroupMap !== em._entityGroupMap) {
                        throw getRootErr("has a different 'EntityManager' than other roots");
                    }
                } else {
                    entityGroupMap = em._entityGroupMap;
                }
            });
        }

        function getExpandFns() {
            try {
                if (!expand) {
                    return [];
                } else if (typeof expand === 'string') {
                    // tricky because Breeze expandClause not exposed publically
                    expand = new breeze.EntityQuery().expand(expand).expandClause;
                }
                if (expand.propertyPaths) { // expand clause
                    expand = expand.propertyPaths;
                } else if (Array.isArray(expand)) {
                    if (!expand.every(function (elem) { return typeof elem === 'string'; })) {
                        throw '';
                    }
                } else { throw ''; }
            } catch (_) {
                throw new Error(
                    "expand must be an expand string, array of string paths, or a query expand clause");
            }

            var fns = expand.map(makePathFns);
            return fns;
        }

        function makePathFns(path) {
            var fns = [],
                segments = path.split('.'),
                type = rootType;

            for (var i = 0, len = segments.length; i < len; i++) {
                var f = makePathFn(type, segments[i]);
                type = f.navType;
                fns.push(f);
            }

            return function (entities) {
                for (var fi = 0, flen = fns.length; fi < len; fi++) {
                    var related = [];
                    f = fns[fi];
                    entities.forEach(function (entity) {
                        related = related.concat(f(entity));
                    });
                    entities = [];
                    var notLast = fi < flen - 1;
                    related.forEach(function (entity) {
                        if (results.indexOf(entity) < 0) {
                            results.push(entity);
                        }
                        if (notLast && entities.indexOf(entity) < 0) {
                            entities.push(entity);
                        }
                    });
                }
            };
        }

        function makePathFn(baseType, path) {
            var baseTypeName, fn = undefined, navType;
            try {
                baseTypeName = baseType.name;
                var nav = baseType.getNavigationProperty(path);
                if (!nav) {
                    throw new Error(path + " is not a navigation property of " + baseTypeName);
                }
                navType = nav.entityType;
                var navTypeName = navType.name;
                var fkName = nav.foreignKeyNames[0];
                if (fkName) {
                    fn = function (entity) {
                        var val = [];
                        try {
                            var keyValue = entity.getProperty(fkName);
                            var grp = entityGroupMap[navTypeName];
                            if (grp) {
                                val = grp._entities[grp._indexMap[keyValue]];
                                val = val ? [val] : [];
                            } 
                        } catch (e) { rethrow(e); }
                        return val;
                    };
                } else {
                    fkName = nav.inverse ?
                       nav.inverse.foreignKeyNames[0] :
                       nav.inverseForeignKeyNames[0];
                    if (!fkName) { throw ''; }
                    fn = function (entity) {
                        var val = [];
                        try {
                            var keyValue = entity.entityAspect.getKey().values[0];
                            var grp = entityGroupMap[navTypeName];
                            val = grp ?
                                grp._entities.filter(function (en) {
                                    return en.getProperty(fkName) === keyValue;
                                }) : [];
                        } catch (e) { rethrow(e); }
                        return val;
                    };
                }
                fn.navType = navType;
                fn.path = path;


            } catch (err) { rethrow(err); }
            return fn;

            function rethrow(e){
                var typeName = baseTypeName || baseType;
                var error = new Error("'getEntityGraph' can't expand '" + path + "' for " + typeName);
                error.innerError = e;
                throw error;
            }
        }
    }

}, this));