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
    var EntityState = breeze.EntityState;

    var altServiceName = "breeze/Inheritance";

    var newEm = testFns.newEm;
    var newEmX = testFns.newEmX;

    if (testFns.DEBUG_MONGO) {
        test("Skipping inherit billing tests - DB not yet avail", function () {
            ok(true, "Skipped tests - Mongo");
        });
        return;
    };

    module("inheritBilling", {
        setup: function () {
            testFns.setup({ serviceName: altServiceName } );
        },
        teardown: function () {
        }
    });

    function queryBillingBase(typeName) {
        var em = newEmX();

        var q = EntityQuery.from(typeName + 's')
            .using(em);
        stop();
        var iopType = em.metadataStore.getEntityType(typeName);
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some " + typeName);
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(iopType);
            }));

        }).fail(function (e) {
            ok(false, e.message);
        }).fin(start);

    }

    test("query BillingDetailTPH", function () {
        queryBillingBase("BillingDetailTPH");
    });
    test("query BillingDetailTPT", function () {
        queryBillingBase("BillingDetailTPT");
    });
    test("query BillingDetailTPC", function () {
        queryBillingBase("BillingDetailTPC");
    });


    test("export metadata", function () {
        var em = newEm();
        var ets = em.metadataStore.getEntityTypes();
       
        var exportedMs = em.metadataStore.exportMetadata();
        var em2 = newEm();

        em2.metadataStore.importMetadata(exportedMs);
        var ets2 = em2.metadataStore.getEntityTypes();
        ok(ets.length === ets2.length, "lengths should be the same");
    });


    function queryBillingBaseWithES5(typeName) {
        var em = newEmX();
        
        var baseType = registerBaseBillingDetailWithES5(em, typeName);
        

        var q = EntityQuery.from(typeName + 's')
            .using(em);
        stop();
        

        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some " + typeName);
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(baseType);
            }), "every item is subtype");
            ok(r.every(function (f) {
                var miscData = f.getProperty("miscData");
                return miscData === "asdf";
            }), "every item has miscData == asdf");
            ok(r.every(function (f) {
                var owner = f.getProperty("owner");
                return owner.length > 1 && owner.toUpperCase() === owner;
            }), "every item has uppercase owner property");
            ok(r.every(function (f) {
                var ido = f.getProperty("idAndOwner");
                var id = f.getProperty("id");
                var owner = f.getProperty("owner");
                return ido.length > 1 && ido == (id + ':' + owner);
            }), "every item has idAndOwner property == id:owner");

        }).fail(function (e) {
            ok(false, e.message);
        }).fin(start);
    }

    test("query BillingDetailTPH - ES5", function () {
        queryBillingBaseWithES5("BillingDetailTPH");
    });
    test("query BillingDetailTPT - ES5", function () {
        queryBillingBaseWithES5("BillingDetailTPT");
    });
    test("query BillingDetailTPC - ES5", function () {
        queryBillingBaseWithES5("BillingDetailTPC");
    });


    test("query BankAccountTPH - ES5", function () {
        queryBillingBaseWithES5("BankAccountTPH");
    });
    test("query BankAccountTPT - ES5", function () {
        queryBillingBaseWithES5("BankAccountTPT");
    });
    test("query BankAccountTPC - ES5", function () {
        queryBillingBaseWithES5("BankAccountTPC");
    });

    test("can delete BankAccountTPH - ES5", function () {
        assertCanDelete("BankAccountTPH", "deposits");
    });

    test("can delete BankAccountTPT - ES5", function () {
        assertCanDelete("BankAccountTPT", "deposits");
    });

    test("can delete BankAccountTPC - ES5", function () {
        assertCanDelete("BankAccountTPC", "deposits");
    });

    function assertCanDelete(typeName, expandPropName) {
        var em = newEm();

        // Registering resource names for each derived type
        // because these resource names are not in metadata
        // because there are no corresponding DbSets in the DbContext
        // and that's how Breeze generates resource names
        em.metadataStore.setEntityTypeForResourceName(typeName + 's', typeName);
        var targetEntity;
        var key;

        var q = EntityQuery.from(typeName + 's').take(1);
        if (expandPropName) {
            q = q.expand(expandPropName);
        }
        stop();
        return q.using(em).execute().then(querySuccess).fail(testFns.handleFail).fin(start);

        function querySuccess(data) {
            targetEntity = data.results[0];

            var dependentEntities;
            if (expandPropName) {
                dependentEntities = targetEntity.getProperty(expandPropName);
                dependentEntities.slice(0).forEach(function (de) {
                    de.entityAspect.setDeleted();
                });
            }
            // can't delete the parent until we get rid of the children
            targetEntity.entityAspect.setDeleted();

            key = targetEntity.entityAspect.getKey();
            return em.saveChanges().then(saveSuccess).fail(testFns.handleFail);
        }

        function saveSuccess(saveResult) {
            var savedEntities = saveResult.entities;
            
            ok(savedEntities.indexOf(targetEntity)>=0,
                "should have a deleted " + typeName + " in the save result");
            ok(savedEntities.every(function (entity) {
                return entity.entityAspect.entityState.isDetached();
            }), "all deleted entities should now be 'Detached'");
            

            return em.fetchEntityByKey(key).then(requerySuccess).fail(testFns.handleFail);
        }

        function requerySuccess(data) {
            var refetched = data.entity;
            ok(!refetched, core.formatString("requery of the deleted {0} with key '{1}' should return null because no longer in the db.", typeName, JSON.stringify(key.values)));
        }
    }

    


    function createBillingDetailWithES5(typeName, baseTypeName, data) {
        
        var em = newEmX();
                
        var baseType = registerBaseBillingDetailWithES5(em, baseTypeName);
        

        var x = em.createEntity(typeName, data);
        ok(x.entityAspect.entityState === EntityState.Added);

        ok(x.entityType.isSubtypeOf(baseType), "is subtype of " + baseTypeName);

        var number = x.getProperty("number");
        ok(number === data.number);

        var miscData = x.getProperty("miscData");
        ok(miscData === "asdf", "miscData === asdf");

        var owner = x.getProperty("owner");
        ok(owner.length > 1, "has owner property");
        ok(owner === data.owner.toUpperCase(), "owner property is uppercase");

        var idAndOwner = x.getProperty("idAndOwner");
        ok(idAndOwner.length > 1, "has idAndOwner property");
        var id = x.getProperty("id");
        var owner = x.getProperty("owner");
        ok(idAndOwner == (id + ':' + owner), "idAndOwner property == id:owner");
    }

    function registerBaseBillingDetailWithES5(em, baseTypeName) {
        var baseCtor = models.BillingDetailWithES5();
        em.metadataStore.registerEntityTypeCtor(baseTypeName, baseCtor);
        var baseType = em.metadataStore.getEntityType(baseTypeName);
        // 1) we cannot change the ctor of an object in js.
        // 2) we can only set prototype on a ctor fn not on an instance.
        // 3) prototypes are instances - so to get the proto of a proto you need to use getPrototypeOf
        baseType.subtypes.forEach(function (subtype) {
            // subCtor = subtype.getCtor(true);
            // subCtor.prototype = new baseCtor();
            // forces refresh
            // subtype.getCtor(true);
            //em.metadataStore.registerEntityTypeCtor(subtype.name, subCtor);
            newCtor = function () { };
            newCtor.prototype = new baseCtor();
            em.metadataStore.registerEntityTypeCtor(subtype.name, newCtor);
        });
        return baseType;
    }

    var billingDetailData = {
        id: 456,
        createdAt: new Date(),
        owner: "Richie Rich",
        number: "888-888-8"
    };

    var bankAccountData = {
        id: 789,
        createdAt: new Date(),
        owner: "Scrooge McDuck",
        number: "999-999-9",
        bankName: "Bank of Duckburg",
        swift: "RICHDUCK"
    };

    test("create BillingDetailTPH - ES5", function () {
        createBillingDetailWithES5("BillingDetailTPH", "BillingDetailTPH", billingDetailData);
    });
    test("create BillingDetailTPT - ES5", function () {
        createBillingDetailWithES5("BillingDetailTPT", "BillingDetailTPT", billingDetailData);
    });
    test("create BillingDetailTPC - ES5", function () {
        createBillingDetailWithES5("BillingDetailTPC", "BillingDetailTPC", billingDetailData);
    });


    test("create BankAccountTPH - ES5", function () {
        createBillingDetailWithES5("BankAccountTPH", "BillingDetailTPH", bankAccountData);
    });
    test("create BankAccountTPT - ES5", function () {
        createBillingDetailWithES5("BankAccountTPT", "BillingDetailTPT", bankAccountData);
    });
    test("create BankAccountTPC - ES5", function () {
        createBillingDetailWithES5("BankAccountTPC", "BillingDetailTPC", bankAccountData);
    });


    var models = {};
    models.BillingDetailWithES5 = function () {

        var ctor;
        if (testFns.modelLibrary == "ko") {
            ctor = function () {

            };
            createBillingDetailES5Props(ctor.prototype);

        } else if (testFns.modelLibrary == "backbone") {
            ctor = Backbone.Model.extend({
                initialize: function (attr, options) {
                    createBillingDetailES5Props(this.attributes);
                }
            });

        } else {
            ctor = function () {

            };
            createBillingDetailES5Props(ctor.prototype);
        }
        return ctor;

    };

    function createBillingDetailES5Props(target) {
        Object.defineProperty(target, "owner", {
            get: function () {
                return this["_owner"] || null;
            },
            set: function (value) {
                this["_owner"] = value.toUpperCase();
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

        Object.defineProperty(target, "idAndOwner", {
            get: function () {
                return this.getProperty && this.getProperty("id") + ":" + this.getProperty("owner") || "";
            },
            enumerable: true,
            configurable: true
        });
    }


})(breezeTestFns);