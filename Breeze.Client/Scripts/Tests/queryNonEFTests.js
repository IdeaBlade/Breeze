require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    var Event = core.Event;
    
    var entityModel = breeze.entityModel;
    var EntityType = entityModel.EntityType;
    var DataProperty = entityModel.DataProperty;
    var NavigationProperty = entityModel.NavigationProperty;
    var DataType = entityModel.DataType;
    var EntityQuery = entityModel.EntityQuery;
    var MetadataStore = entityModel.MetadataStore;
    var EntityManager = entityModel.EntityManager;
    var EntityKey = entityModel.EntityKey;
    var FilterQueryOp = entityModel.FilterQueryOp;
    var Predicate = entityModel.Predicate;
    var QueryOptions = entityModel.QueryOptions;
    var FetchStrategy = entityModel.FetchStrategy;
    var MergeStrategy = entityModel.MergeStrategy;

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
        var query = entityModel.EntityQuery.from("Persons");
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
        var query = entityModel.EntityQuery.from("Persons");
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
            metadataStore: metadataStore,
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
        
        et = new EntityType({
            metadataStore: metadataStore,
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
        
        et = new EntityType({
            metadataStore: metadataStore,
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

        et = new EntityType({
            metadataStore: metadataStore,
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
    }
    return testFns;

});

