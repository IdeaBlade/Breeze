require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
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
        var altServiceName = "api/NonEFModel";

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
    
    
    test("getSimple - anonymous - Persons", function() {
        var em = newAltEm();
        
        var query = breeze.EntityQuery.from("Persons");
        stop();
        
        em.executeQuery(query).then(function(data) {
            ok(data.results.length > 0);
            var person = data.results[0];
            ok(person.meals.length > 0, "person should have meals");
            ok(person.meals[0].person === person, "check internal consistency");
            var ents = em.getEntities();
            ok(ents.length === 0,"should return 0 - not yet entities");
            start();
        }).fail(testFns.handleFail).fin(start);
        
    });
    
    test("getSimple - typed - Persons", function () {
        var em = newAltEm();
        // HACK - add to the API for this
        initializeMetadataStore(em.metadataStore);
        var query = breeze.EntityQuery.from("Persons");
        stop();

        em.executeQuery(query).then(function (data) {
            ok(data.results.length > 0);
            var person = data.results[0];
            var meals = person.getProperty("meals");
            ok(meals.length > 0, "person should have meals");
            ok(meals[0].getProperty("person") === person, "check internal consistency");
            var ents = em.getEntities();
            ok(ents.length > 0, "should return some entities");
            start();
        }).fail(testFns.handleFail).fin(start);

    });
    
    function initializeMetadataStore(metadataStore) {
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
    
    function initializeMetadataStore2(metadataStore, serviceName) {
        var entityTypes = [ {
            shortName: "Person",
            namespace: "Sample_WebApi.Models",
            dataProperties: [{
                    name: "personId",
                    dataType: DataType.Int32,
                    isNullable: false,
                    isPartOfKey: true,
                }, {
                    name: "firstName",
                    dataType: DataType.String,
                    isNullable: false,
                }, {
                    name: "lastName",
                    dataType: DataType.String,
                    isNullable: false,
                }, {
                    name: "birthDate",
                    dataType: DataType.DateTime,
                    isNullable: true
                }],
            navigationProperties: [{
                name: "meals",
                entityTypeName: "Meal",
                isScalar: false,
                associationName: "personMeals"
            }]
        }, {
            shortName: "Meal",
            namespace: "Sample_WebApi.Models",
            dataProperties: [{
                    name: "mealId",
                    dataType: DataType.Int32,
                    isNullable: false,
                    isPartOfKey: true,
                }, {
                    name: "personId",
                    dataType: DataType.Int32,
                    isNullable: false,
                }, {
                    name: "dateConsumed",
                    dataType: DataType.DateTime,
                    isNullable: false,
                }],
            navigationProperties: [{
                    name: "person",
                    entityTypeName: "Person",
                    isScalar: true,
                    associationName: "personMeals",
                    foreignKeyNames: ["personId"]
                }, {
                    name: "dishes",
                    entityTypeName: "Dish",
                    isScalar: false,
                    associationName: "mealDishes",
                }]
        }, {
            shortName: "Dish",
            namespace: "Sample_WebApi.Models",
            dataProperties: [{
                    name: "dishId",
                    dataType: DataType.Int32,
                    isNullable: false,
                    isPartOfKey: true,
                }, {
                    name: "foodName",
                    dataType: DataType.String,
                    isNullable: false,
                }, {
                    name: "servingSize",
                    dataType: DataType.Double,
                    isNullable: false,
                }],
            navigationProperties: [{
                name: "food",
                entityTypeName: "Food",
                isScalar: true,
                associationName: "DishFood",
                foreignKeyNames: ["foodName"]
            }]
        }, {
            shortName: "Food",
            namespace: "Sample_WebApi.Models",
            dataProperties: [{
                    name: "foodName",
                    dataType: DataType.String,
                    isNullable: false,
                    isPartOfKey: true,
                }, {
                    name: "calories",
                    dataType: DataType.Int32,
                    isNullable: false,
                }]
        }];
    }
    
    return testFns;

});

