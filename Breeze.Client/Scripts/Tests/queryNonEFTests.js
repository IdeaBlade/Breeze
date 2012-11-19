require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;
    
    
    var EntityType = breeze.EntityType;
    var DataProperty = breeze.DataProperty;
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

    var newEm = testFns.newEm;
    
    module("queryNonEF", {
        setup: function () {
            // testFns.setup();
            testFns.setup({
                serviceName: "api/NonEFModel",
                serviceHasMetadata: false
            });
        },
        teardown: function () {
        }
    });
    
    
    test("getSimple - anonymous - Persons", function() {
        var em = newEm();
        // HACK - add to the API for this
        em.metadataStore.serviceNames.push(em.serviceName);
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
        var em = newEm();
        // HACK - add to the API for this
        em.metadataStore.serviceNames.push(em.serviceName);
        initializeMetadataStore(em.metadataStore, em.serviceName);
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
    
    function initializeMetadataStore(metadataStore, serviceName) {
        var et = new EntityType({
            serviceName: serviceName,
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
            serviceName: serviceName,
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
            serviceName: serviceName,
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
            serviceName: serviceName,
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
            serviceName: serviceName,
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
            serviceName: serviceName,
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
            serviceName: serviceName,
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
            serviceName: serviceName,
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

