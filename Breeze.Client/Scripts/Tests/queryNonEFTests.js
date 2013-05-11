(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;
    
    
    var EntityType = breeze.EntityType;
    var NamingConvention = breeze.NamingConvention;
    var DataProperty = breeze.DataProperty;
    var DataService = breeze.DataService;
    var NavigationProperty = breeze.NavigationProperty;
    var DataType = breeze.DataType;
    var EntityQuery = breeze.EntityQuery;
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityKey = breeze.EntityKey;
    var FilterQueryOp = breeze.FilterQueryOp;
    var Predicate = breeze.Predicate;
    var QueryOptions = breeze.QueryOptions;
    var FetchStrategy = breeze.FetchStrategy;
    var MergeStrategy = breeze.MergeStrategy;

   
    module("queryNonEF", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {
        }
    });

    
    
    function newAltEm() {
        var altServiceName = "breeze/NonEFModel";

        var dataService = new DataService({
            serviceName: altServiceName,
            hasServerMetadata: false
        });
        var altMs = new MetadataStore({
            namingConvention: NamingConvention.camelCase
        });
        
        return new EntityManager({
            dataService: dataService,
            metadataStore: altMs
        });
    }

    test("bad addEntityType - no key", function () {
        var ms = new MetadataStore();
        try {
            ms.addEntityType({
                shortName: "Person",
                namespace: "Sample_WebApi.Models",
                dataProperties: {
                    personId: { dataType: DataType.Int32, isNullable: false },
                    firstName: { dataType: DataType.String, isNullable: false },
                    lastName: { dataType: DataType.String, isNullable: false },
                    birthDate: { dataType: DataType.DateTime }
                },
            });
            ok(false, "should not get here")
        } catch (e) {
            ok(e.message.toLowerCase().indexOf("ispartofkey") >= 0, "message should mention 'isPartOfKey'");
        }
    });
    
    test("create complexType - compact form", function () {
        var ms = new MetadataStore();
        try {
            ms.addEntityType({
                shortName: "Foo",
                namespace: "Sample_WebApi.Models",
                isComplexType: true,
                dataProperties: {
                    firstName: { dataType: DataType.String, isNullable: false },
                    lastName: { dataType: DataType.String, isNullable: false },
                    birthDate: { dataType: DataType.DateTime }
                },
            });
            ok(true, "should get here")
        } catch (e) {
            ok(false, "should not get here");
        }
    });

    
    test("getSimple - anonymous - Persons", function() {
        var em = newAltEm();
        
        var query = breeze.EntityQuery.from("Persons");
        stop();
        
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0);
            var person = data.results[0];
            ok(person.meals.length > 0, "person should have meals");
            // deliberately omitted because we only use ids to link meals -> person 
            // and fixup will not occur with anon types
            // ok(person.meals[0].person === person, "check internal consistency");
            var ents = em.getEntities();
            ok(ents.length === 0,"should return 0 - not yet entities");
        }).fail(testFns.handleFail).fin(start);
        
    });
    
    test("getSimple - typed - Persons", function () {
        var em = newAltEm();
        
        initializeMetadataStore(em.metadataStore);
        var query = breeze.EntityQuery.from("Persons");
        stop();

        em.executeQuery(query).then(function (data) {
            ok(!em.hasChanges(), "should not have any changes");
            ok(data.results.length > 0);
            var person = data.results[0];
            var meals = person.getProperty("meals");
            ok(meals.length > 0, "person should have meals");
            ok(meals[0].getProperty("person") === person, "check internal consistency");
            var ents = em.getEntities();
            ok(ents.length > 0, "should return some entities");
        }).fail(testFns.handleFail).fin(start);

    });

    test("getSimple - typed - Persons - long form metadata", function () {
        var em = newAltEm();

        initializeMetadataStore_long(em.metadataStore);
        var query = breeze.EntityQuery.from("Persons");
        stop();

        em.executeQuery(query).then(function (data) {
            ok(!em.hasChanges(), "should not have any changes");
            ok(data.results.length > 0);
            var person = data.results[0];
            var meals = person.getProperty("meals");
            ok(meals.length > 0, "person should have meals");
            ok(meals[0].getProperty("person") === person, "check internal consistency");
            var ents = em.getEntities();
            ok(ents.length > 0, "should return some entities");
        }).fail(testFns.handleFail).fin(start);

    });

    function initializeMetadataStore(metadataStore) {
        metadataStore.addEntityType({
            shortName: "Person",
            namespace: "Sample_WebApi.Models",
            dataProperties: {
                personId: { dataType: DataType.Int32, isNullable: false, isPartOfKey: true },
                firstName: { dataType: DataType.String, isNullable: false },
                lastName: { dataType: DataType.String, isNullable: false },
                birthDate: { dataType: DataType.DateTime }
            },
            navigationProperties: {
                meals: { entityTypeName: "Meal", isScalar: false, associationName: "personMeals" }
            }
        });

        metadataStore.addEntityType({
            shortName: "Meal",
            namespace: "Sample_WebApi.Models",
            dataProperties: {
                mealId: { dataType: DataType.Int32, isNullable: false, isPartOfKey: true },
                personId: { dataType: DataType.Int32, isNullable: false },
                dateConsumed: { dataType: DataType.DateTime, isNullable: false }
            },
            navigationProperties: {
                person: { entityTypeName: "Person", isScalar: true, associationName: "personMeals", foreignKeyNames: ["personId"] },
                dishes: { entityTypeName: "Dish", isScalar: false, associationName: "mealDishes" }
            }
        });

        var et = new EntityType({
            shortName: "Dish",
            namespace: "Sample_WebApi.Models",
            dataProperties: {
                dishId: { dataType: DataType.Int32, isNullable: false, isPartOfKey: true },
                foodName: { dataType: DataType.String, isNullable: false },
                servingSize: { dataType: DataType.Double, isNullable: false }
            },
            navigationProperties: {
                food: { entityTypeName: "Food", isScalar: true, associationName: "DishFood", foreignKeyNames: ["foodName"] }
            }
        });
        metadataStore.addEntityType(et);

        et = new EntityType({
            shortName: "Food",
            namespace: "Sample_WebApi.Models",
            dataProperties: {
                foodName: { dataType: DataType.String, isNullable: false, isPartOfKey: true },
                calories: { dataType: DataType.Int32, isNullable: false }
            }
        });
        metadataStore.addEntityType(et);
    }
    
    function initializeMetadataStore_long(metadataStore) {
        var et = new EntityType({
            shortName: "Person",
            namespace: "Sample_WebApi.Models"
        });
        et.addProperty( new DataProperty({
            name: "personId",
            dataType: DataType.Int32,
            isNullable: false,
            isPartOfKey: true,
        }));
        et.addProperty(new DataProperty({
            name: "firstName",
            dataType: DataType.String,
            isNullable: false,
        }));
        et.addProperty(new DataProperty({
            name: "lastName",
            dataType: DataType.String,
            isNullable: false,
        }));
        et.addProperty(new DataProperty({
            name: "birthDate",
            dataType: DataType.DateTime,
            isNullable: true
        }));
        et.addProperty(new NavigationProperty({
            name: "meals",
            entityTypeName: "Meal",
            isScalar: false,
            associationName: "personMeals"
        }));
        metadataStore.addEntityType(et);
        
        et = new EntityType({
            shortName: "Meal",
            namespace: "Sample_WebApi.Models"
        });
        et.addProperty(new DataProperty({
            name: "mealId",
            dataType: DataType.Int32,
            isNullable: false,
            isPartOfKey: true,
        }));
        et.addProperty(new DataProperty({
            name: "personId",
            dataType: DataType.Int32,
            isNullable: false,
        }));
        et.addProperty(new DataProperty({
            name: "dateConsumed",
            dataType: DataType.DateTime,
            isNullable: false,
        }));
        et.addProperty(new NavigationProperty({
            name: "person",
            entityTypeName: "Person",
            isScalar: true,
            associationName: "personMeals",
            foreignKeyNames: ["personId"]
        }));
        et.addProperty(new NavigationProperty({
            name: "dishes",
            entityTypeName: "Dish",
            isScalar: false,
            associationName: "mealDishes",
        }));
        metadataStore.addEntityType(et);
        
        et = new EntityType({
            shortName: "Dish",
            namespace: "Sample_WebApi.Models"
        });
        et.addProperty(new DataProperty({
            name: "dishId",
            dataType: DataType.Int32,
            isNullable: false,
            isPartOfKey: true,
        }));
        et.addProperty(new DataProperty({
            name: "foodName",
            dataType: DataType.String,
            isNullable: false,
        }));
        et.addProperty(new DataProperty({
            name: "servingSize",
            dataType: DataType.Double,
            isNullable: false,
        }));
        et.addProperty(new NavigationProperty({
            name: "food",
            entityTypeName: "Food",
            isScalar: true,
            associationName: "DishFood",
            foreignKeyNames: ["foodName"]
        }));
        metadataStore.addEntityType(et);

        et = new EntityType({
            shortName: "Food",
            namespace: "Sample_WebApi.Models"
        });
        et.addProperty(new DataProperty({
            name: "foodName",
            dataType: DataType.String,
            isNullable: false,
            isPartOfKey: true,
        }));
        et.addProperty(new DataProperty({
            name: "calories",
            dataType: DataType.Int32,
            isNullable: false,
        }));
        metadataStore.addEntityType(et);
    }
    
    //function initializeMetadataStore_import(metadataStore, serviceName) {
    //    var entityTypes = [ {
    //        shortName: "Person",
    //        namespace: "Sample_WebApi.Models",
    //        dataProperties: [{
    //                name: "personId",
    //                dataType: DataType.Int32,
    //                isNullable: false,
    //                isPartOfKey: true,
    //            }, {
    //                name: "firstName",
    //                dataType: DataType.String,
    //                isNullable: false,
    //            }, {
    //                name: "lastName",
    //                dataType: DataType.String,
    //                isNullable: false,
    //            }, {
    //                name: "birthDate",
    //                dataType: DataType.DateTime,
    //                isNullable: true
    //            }],
    //        navigationProperties: [{
    //            name: "meals",
    //            entityTypeName: "Meal",
    //            isScalar: false,
    //            associationName: "personMeals"
    //        }]
    //    }, {
    //        shortName: "Meal",
    //        namespace: "Sample_WebApi.Models",
    //        dataProperties: [{
    //                name: "mealId",
    //                dataType: DataType.Int32,
    //                isNullable: false,
    //                isPartOfKey: true,
    //            }, {
    //                name: "personId",
    //                dataType: DataType.Int32,
    //                isNullable: false,
    //            }, {
    //                name: "dateConsumed",
    //                dataType: DataType.DateTime,
    //                isNullable: false,
    //            }],
    //        navigationProperties: [{
    //                name: "person",
    //                entityTypeName: "Person",
    //                isScalar: true,
    //                associationName: "personMeals",
    //                foreignKeyNames: ["personId"]
    //            }, {
    //                name: "dishes",
    //                entityTypeName: "Dish",
    //                isScalar: false,
    //                associationName: "mealDishes",
    //            }]
    //    }, {
    //        shortName: "Dish",
    //        namespace: "Sample_WebApi.Models",
    //        dataProperties: [{
    //                name: "dishId",
    //                dataType: DataType.Int32,
    //                isNullable: false,
    //                isPartOfKey: true,
    //            }, {
    //                name: "foodName",
    //                dataType: DataType.String,
    //                isNullable: false,
    //            }, {
    //                name: "servingSize",
    //                dataType: DataType.Double,
    //                isNullable: false,
    //            }],
    //        navigationProperties: [{
    //            name: "food",
    //            entityTypeName: "Food",
    //            isScalar: true,
    //            associationName: "DishFood",
    //            foreignKeyNames: ["foodName"]
    //        }]
    //    }, {
    //        shortName: "Food",
    //        namespace: "Sample_WebApi.Models",
    //        dataProperties: [{
    //                name: "foodName",
    //                dataType: DataType.String,
    //                isNullable: false,
    //                isPartOfKey: true,
    //            }, {
    //                name: "calories",
    //                dataType: DataType.Int32,
    //                isNullable: false,
    //            }]
    //    }];
    //}
    
})(breezeTestFns);