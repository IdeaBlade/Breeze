(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;
    
    
    var EntityQuery = breeze.EntityQuery;
    var DataService = breeze.DataService;
    var MetadataStore = breeze.MetadataStore;
    var NamingConvention = breeze.NamingConvention;
    var EntityManager = breeze.EntityManager;
    var EntityKey = breeze.EntityKey;
    var FilterQueryOp = breeze.FilterQueryOp;
    var Predicate = breeze.Predicate;
    var QueryOptions = breeze.QueryOptions;
    var FetchStrategy = breeze.FetchStrategy;
    var MergeStrategy = breeze.MergeStrategy;

    var altServiceName = "breeze/ProduceTPH";

    var newEm = testFns.newEm;
    var newEmX = testFns.newEmX;

    if (testFns.DEBUG_MONGO) {
        test("Skipping inherit produce tests - DB not yet avail", function () {
            ok(true, "Skipped tests - Mongo");
        });
        return;
    };
    
    module("inheritProduce", {
        setup: function () {
            testFns.setup({ serviceName: altServiceName } );
        },
        teardown: function () {
        }
    });
    
    test("getEntityByKey failing 1", function () {
        var manager = newEmX();
        var query = new breeze.EntityQuery()
            .from("Fruits");
        stop();
        manager.executeQuery(query).then(function (data) {
            var fruit1 = data.results[0];
            var key = fruit1.getProperty("id");
            var fruit2 = manager.getEntityByKey("Fruit", key);
            ok(fruit1 === fruit2, "should be same entity");
        }).fail(testFns.handleFail).fin(start);
    });

    test("query with predicate failing on inheritance entities", function () {
        var manager = newEmX();

        var predicate = Predicate.create('name', '==', 'Apple')
            .or('name', '==', 'Orange')
            .or('name', '==', "Papa");

        var query = new breeze.EntityQuery()
            .from("Fruits")
            .where(predicate)
        // .toType('ItemOfProduce');  // this will fail because 'ItemOfProduce' does not have a 'name' property.
            .toType("Fruit");  // without this we get the "time" issue.

        stop();
        manager.executeQuery(query).then(function (data) {
            ok(true);
        }).fail(function (e) {
            ok(false, e.message);
        }).fin(start);
    });

    test("getEntityByKey failing 2", function () {
        var manager = newEmX();
        var query = new breeze.EntityQuery()
            .from("ItemsOfProduce");
        stop();
        manager.executeQuery(query).then(function (data) {
            var ioprod1 = data.results[0];
            var key = ioprod1.getProperty("id");
            var ioprod2 = manager.getEntityByKey("ItemOfProduce", key);
            ok(ioprod1 === ioprod2, "should be same entity");
        }).fail(testFns.handleFail).fin(start);
    });

    test("Localquery failing on inheritance entities1", function () {
        var manager = newEmX();
        var query = new breeze.EntityQuery()
            .from("Fruits");
        stop();
        manager.executeQuery(query).then(function (data) {
            var fruits = data.results;

            // toType is needed because the "Fruits" resource does not map to any entityTypes. 
            var newQuery = new EntityQuery("Fruits").toType("Fruit");
            // uncomment next line to see detailed error message explaining the issue.
            // var newQuery = new EntityQuery("Fruits");
            var fruits2 = manager.executeQueryLocally(newQuery);
            ok(true);
        }).fail(function (e) {
            ok(false, e.message);
        }).fin(start);
    });

    test("Localquery failing on inheritance entities2", function () {
        var manager = newEmX();
        var query = new breeze.EntityQuery()
            .from("Fruits");
        stop();
        manager.executeQuery(query).then(function (data) {
            var fruits = data.results;

            manager.metadataStore.setEntityTypeForResourceName("Fruits", "Fruit");
            var newQuery = new EntityQuery("Fruits");
            var fruits2 = manager.executeQueryLocally(newQuery);
            ok(true);
        }).fail(function (e) {
            ok(false, e.message);
        }).fin(start);
    });

    test("EntityKey for ItemsOfProduce", function() {
        var em = newEmX();
        
        var rdAppleId = "D35E9669-2BAE-4D69-A27A-252B31800B74";
        var et = em.metadataStore.getEntityType("ItemOfProduce");
        
        var ek = new EntityKey(et, rdAppleId);
        stop();
        em.fetchEntityByKey(ek).then(function(data) {
            item = data.entity;
            ok(item, "item should have been found");
        
        }).fail(testFns.handleFail).fin(start);

    });
    
    test("fetchEntityByKey Apple", function () {
        var em = newEmX();
        var blackBeansId = "D234F206-D0C8-40E3-9BF8-0ED190ED0C0C";
        var rdAppleId = "D35E9669-2BAE-4D69-A27A-252B31800B74";
        var appleType = em.metadataStore.getEntityType("Apple");
        stop();
        var item;
        em.fetchEntityByKey("Apple", rdAppleId).then(function(data) {
            item = data.entity;
            ok(item, "item should have been found");
            ok(data.fromCache === false, "should have been from database");
            ok(item.entityType === appleType);
            return em.fetchEntityByKey("Apple", rdAppleId, true);
        }).then(function(data2) {
            item = data2.entity;
            ok(item, "item should have been found");
            ok(data2.fromCache === true, "should have been from cache");
            ok(item.entityType === appleType);
        }).fail(testFns.handleFail).fin(start);
    });
 
    test("query ItemsOfProduce", function () {
        var em = newEmX();

        var q = EntityQuery.from("ItemsOfProduce")
            .using(em);
        stop();
        var iopType = em.metadataStore.getEntityType("ItemOfProduce");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'ItemsOfProduce'");
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(iopType);
            }));

        }).fail(testFns.handleFail).fin(start);

    });

    test("query Fruits w/server ofType", function () {
        var em = newEmX();

        var q = EntityQuery.from("Fruits")
            .using(em);
        stop();
        var fruitType = em.metadataStore.getEntityType("Fruit");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'Fruits'");
            ok(r.every(function(f) {
                return f.entityType.isSubtypeOf(fruitType);
            }));
            
        }).fail(testFns.handleFail).fin(start);
            
    });
    
    test("query Fruits w/client ofType", function () {
        var em = newEmX();
        ok(false, "Expected failure - OfType operator not yet supported - will be added later");
        return;
        
        var q = EntityQuery.from("ItemsOfProduce")
            .where(null, FilterQueryOp.IsTypeOf, "Fruit")
            .using(em);
        stop();
        var fruitType = em.metadataStore.getEntityType("Fruit");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'Fruits'");
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(fruitType);
            }));

        }).fail(testFns.handleFail).fin(start);

    });

    test("query Fruits locally", function () {
        var em = newEmX();

        var q = EntityQuery.from("Fruits")
            .using(em);
        stop();
        
        q.execute().then(function (data) {
            var fruits = data.results;
            ok(fruits.length > 0, "should have found some 'Fruits'");
            // var q2 = q;
            var q2 = q.toType("Fruit");
            var fruits2 = em.executeQueryLocally(q2);
            ok(fruits2.length === fruits.length);
            
        }).fail(testFns.handleFail).fin(start);

    });

    test("query ItemsOfProduce and modify ", function () {
        var em = newEmX();
        registerItemOfProduceWithES5(em, "ItemOfProduce");

        var q = EntityQuery.from("ItemsOfProduce")
            .using(em).take(2);
        stop();

        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length == 2, "should have found two 'ItemsOfProduce'");

            var r0value = r[0].getProperty("quantityPerUnit");
            var r1value = r[1].getProperty("quantityPerUnit");
            ok(r0value != null, "value should not be null");
            r[0].setProperty("quantityPerUnit", "zzzz");
            var r0valueNew = r[0].getProperty("quantityPerUnit");
            var r1valueNew = r[1].getProperty("quantityPerUnit");

            ok(r0valueNew === "ZZZZ", "r0ValueNew should have changed");
            ok(r1valueNew === r1value, "r1ValueNew should not have changed");

        }).fail(testFns.handleFail).fin(start);
    });

    test("query ItemsOfProduce unique quantityPerProduct values", function () {
        var em = newEmX();
        registerItemOfProduceWithES5(em, "ItemOfProduce");

        var q = EntityQuery.from("ItemsOfProduce")
            .using(em);
        stop();
        
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'ItemsOfProduce'");
            var uniqueValues = {};
            var count = 0;
            r.forEach(function (item) {
                var value = item.getProperty("quantityPerUnit");
                if (!uniqueValues[value]) {
                    uniqueValues[value] = true;
                    count = count + 1;
                }
            });
            ok(count > 1, "count shoud be greater than 1")
        }).fail(testFns.handleFail).fin(start);
    });

    test("query ItemsOfProduce - ES5", function () {
        var em = newEmX();
        registerItemOfProduceWithES5(em, "ItemOfProduce");

        var q = EntityQuery.from("ItemsOfProduce")
            .using(em);
        stop();
        var iopType = em.metadataStore.getEntityType("ItemOfProduce");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'ItemsOfProduce'");
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(iopType);
            }), "every item is a subtype");
            ok(r.every(function (f) {
                var name = f.getProperty("name");
                return name.length > 1;
            }), "every should have a name");
            ok(r.every(function (f) {
                var rowVer = f.getProperty("rowVersion");
                var expected = f.entityType.shortName !== "Fruit" ? 3 : 2;
                return rowVer === expected;
            }), "should have the correct rowVer" );
            ok(r.every(function (f) {
                    var initString = f.getProperty("initString");
                    return initString.indexOf("ItemOfProduce") === 0;
            }), "every item should have an initString starting with 'ItemOfProduce");
            ok(r.every(function (f) {
                var miscData = f.getProperty("miscData");
                return miscData === "asdf";
            }), "every item has miscData == asdf");
            ok(r.every(function (f) {
                var u = f.getProperty("quantityPerUnit");
                return u.length > 0 && u.toUpperCase() === u;
            }), "every item has uppercase quantityPerUnit property");
            ok(r.every(function (f) {
                var amount = f.getProperty("amountOnHand");
                var stock = f.getProperty("unitsInStock");
                var quan = f.getProperty("quantityPerUnit");
                return amount.length > 1 && amount == (stock + ':' + quan);
            }), "every item has amountOnHand property == unitsInStock:quantityPerUnit");

        }).fail(testFns.handleFail).fin(start);

    });

    test("query Fruits - ES5", function () {
        var em = newEmX();
        // initializer only down to Fruit - not ItemOfProduce.
        registerItemOfProduceWithES5(em, "Fruit");

        var q = EntityQuery.from("Fruits")
            .using(em);
        stop();
        var iopType = em.metadataStore.getEntityType("Fruit");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'Fruit'");
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(iopType);
            }), "every item is a subtype");
            ok(r.every(function (f) {
                var name = f.getProperty("name");
                return name.length > 1;
            }), "every should have a name");
            ok(r.every(function (f) {
                var rowVer = f.getProperty("rowVersion");
                var expected = f.entityType.shortName !== "Fruit" ? 2 : 1;
                return rowVer === expected;
            }), "should have the correct rowVer");
            ok(r.every(function (f) {
                var initString = f.getProperty("initString");
                return initString.indexOf("Fruit") === 0;
            }), "every item should have an initString starting with 'ItemOfProduce");
            ok(r.every(function (f) {
                var miscData = f.getProperty("miscData");
                return miscData === "asdf";
            }), "every item has miscData == asdf");
            ok(r.every(function (f) {
                var u = f.getProperty("quantityPerUnit");
                return u.length > 0 && u.toUpperCase() === u;
            }), "every item has uppercase quantityPerUnit property");
            ok(r.every(function (f) {
                var amount = f.getProperty("amountOnHand");
                var stock = f.getProperty("unitsInStock");
                var quan = f.getProperty("quantityPerUnit");
                return amount.length > 1 && amount == (stock + ':' + quan);
            }), "every item has amountOnHand property == unitsInStock:quantityPerUnit");

        }).fail(testFns.handleFail).fin(start);

    });

    test("query ItemsOfProduce - Additional Base Class - ES5", function () {
        var em = newEmX();
        registerWithAdditionalBaseClass(em, "ItemOfProduce");

        var q = EntityQuery.from("ItemsOfProduce")
            .using(em);
        stop();
        var iopType = em.metadataStore.getEntityType("ItemOfProduce");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'ItemsOfProduce'");
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(iopType);
            }), "every item is a subtype");
            ok(r.every(function (f) {
                var name = f.getProperty("name");
                return name.length > 1;
            }), "every should have a name");
            ok(r.every(function (f) {
                var rowVer = f.getProperty("rowVersion");
                var expected = f.entityType.shortName !== "Fruit" ? 3 : 2;
                return rowVer === expected;
            }), "should have the correct rowVer");
            ok(r.every(function (f) {
                var initString = f.getProperty("initString");
                return initString.indexOf("ItemOfProduce") === 0;
            }), "every item should have an initString starting with 'ItemOfProduce");
            ok(r.every(function (f) {
                var miscData = f.getProperty("miscData");
                return miscData === "asdf";
            }), "every item has miscData == asdf");
            ok(r.every(function (f) {
                var u = f.getProperty("quantityPerUnit");
                return u.length > 0 && u.toUpperCase() === u;
            }), "every item has uppercase quantityPerUnit property");
            ok(r.every(function (f) {
                var amount = f.getProperty("amountOnHand");
                var stock = f.getProperty("unitsInStock");
                var quan = f.getProperty("quantityPerUnit");
                return amount.length > 1 && amount == (stock + ':' + quan);
            }), "every item has amountOnHand property == unitsInStock:quantityPerUnit");
            ok(r.every(function (f) {
                var onBase = f.getProperty("onBase");
                return onBase === "I am on base";
            }), "every item has onBase == I am on base");

        }).fail(testFns.handleFail).fin(start);

    });

    function registerWithAdditionalBaseClass(em, baseTypeName) {
        var rootCtor = function () { };
        Object.defineProperty(rootCtor.prototype, "onBase", {
            get: function () {
                return this["_onBase"] || "I am on base";
            },
            set: function (value) {
                this["_onBase"] = value;
            },
            enumerable: true,
            configurable: true
        });
        // no easy way to add another initFn without registering a new base type for itemOfProduce with breeze ( right now basetype are coming for EF)
        // hence no test to add an initFn at this level. i.e. possible but not easy to test in current env.
        var entityType = registerItemOfProduceWithES5(em, baseTypeName, rootCtor);
    }

    function registerItemOfProduceWithES5(em, baseTypeName, rootCtor) {

        var baseCtor = models.ItemOfProduceWithES5(rootCtor);
        var baseType = em.metadataStore.getEntityType(baseTypeName);

        registerSelfAndSubtypes(em, baseType, baseCtor);

        return baseType;
    }

    function registerSelfAndSubtypes(em, baseType, baseCtor) {
        em.metadataStore.registerEntityTypeCtor(baseType.name, baseCtor, entityInitializeFn(baseType.name));
        baseType.subtypes.forEach(function (subtype) {
            newCtor = function () { };
            newCtor.prototype = new baseCtor();
            registerSelfAndSubtypes(em, subtype, newCtor);
        });

    }

    function entityInitializeFn(typeName) {
        return function (entity) {
            var rowVer = entity.getProperty("rowVersion");
            rowVer = (rowVer == null) ? 1 : rowVer + 1;
            entity.setProperty("rowVersion", rowVer);
            var initString = entity.getProperty("initString");
            initString = (initString == null || initString == "") ? typeName : initString + "," + typeName;
            entity.setProperty("initString", initString);
        }
    }


    var models = {};
    models.ItemOfProduceWithES5 = function (baseCtor) {

        var ctor;
        if (testFns.modelLibrary == "ko") {
            ctor = function () {

            };
            if (baseCtor) ctor.prototype = new baseCtor();
            createProduceES5Props(ctor.prototype);

        } else if (testFns.modelLibrary == "backbone") {
            ctor = Backbone.Model.extend({
                initialize: function (attr, options) {
                    createProduceES5Props(this.attributes);
                }
            });
            if (baseCtor) ctor.prototype = new baseCtor();

        } else {
            ctor = function () {

            };
            if (baseCtor) ctor.prototype = new baseCtor();
            createProduceES5Props(ctor.prototype);
        }

       
        return ctor;

    };


    function createProduceES5Props(target) {
        Object.defineProperty(target, "quantityPerUnit", {
            get: function () {
                return this["_quantityPerUnit"] || null;
            },
            set: function (value) {
                this["_quantityPerUnit"] = value.toUpperCase();
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(target, "amountOnHand", {
            get: function () {
                return this.getProperty && this.getProperty("unitsInStock") + ":" + this.getProperty("quantityPerUnit") || "";
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(target, "miscData", {
            get: function () {
                return this["_miscData"] || "asdf";
            },
            set: function (value) {
                this["_miscData"] = value;
            },
            enumerable: true,
            configurable: true
        });

        Object.defineProperty(target, "initString", {
            get: function () {
                return this["_initString"] || "";
            },
            set: function (value) {
                this["_initString"] = value;
            },
            enumerable: true,
            configurable: true
        });
    }


})(breezeTestFns);