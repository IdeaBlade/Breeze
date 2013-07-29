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


    test("query BillingTPHs", function() {
        var em = newEmX();

        var q = EntityQuery.from("BillingDetailTPHs")
            .using(em);
        stop();
        var iopType = em.metadataStore.getEntityType("BillingDetailTPH");
        q.execute().then(function(data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'BillingDetailTPH'");
            ok(r.every(function(f) {
                return f.entityType.isSubtypeOf(iopType);
            }));

        }).fail(function(e) {
            ok(false, e.message);
        }).fin(start);
    });
    
    test("query BillingTPT", function () {
        var em = newEmX();

        var q = EntityQuery.from("BillingDetailTPTs")
            .using(em);
        stop();
        var iopType = em.metadataStore.getEntityType("BillingDetailTPT");
        q.execute().then(function (data) {
            var r = data.results;
            ok(r.length > 0, "should have found some 'BillingDetailTPT'");
            ok(r.every(function (f) {
                return f.entityType.isSubtypeOf(iopType);
            }));

        }).fail(testFns.handleFail).fin(start);
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

    //test("query BillingTPT - ES5", function () {
    //    var em = newEmX();

    //    var q = EntityQuery.from("BillingDetailTPTs")
    //        .using(em);
    //    stop();
    //    var iopType = em.metadataStore.getEntityType("BillingDetailTPT");
    //    q.execute().then(function (data) {
    //        var r = data.results;
    //        ok(r.length > 0, "should have found some 'BillingDetailTPT'");
    //        ok(r.every(function (f) {
    //            return f.entityType.isSubtypeOf(iopType);
    //        }));

    //    }).fail(testFns.handleFail).fin(start);
    //});

    //models.BillingDetailWithES5 = function () {

    //    var ctor;
    //    if (testFns.modelLibrary == "ko") {
    //        ctor = function () {

    //        };
    //        createES5Props(ctor.prototype);


    //    } else if (testFns.modelLibrary == "backbone") {
    //        ctor = Backbone.Model.extend({
    //            initialize: function (attr, options) {
    //                createES5Props(this.attributes);
    //            }
    //        });


    //    } else {
    //        ctor = function () {

    //        };
    //        createES5Props(ctor.prototype);
    //    }
    //    return ctor;


    //};

    //function createES5Props(target) {
    //    Object.defineProperty(target, "companyName", {
    //        get: function () {
    //            return this["_companyName"] || null;
    //        },
    //        set: function (value) {
    //            this["_companyName"] = value.toUpperCase();
    //        },
    //        enumerable: true,
    //        configurable: true
    //    });
    //    Object.defineProperty(target, "idAndName", {
    //        get: function () {
    //            return this.customerID + ":" + this._companyName || "";
    //        },
    //        enumerable: true,
    //        configurable: true
    //    });

    //    Object.defineProperty(target, "miscData", {
    //        get: function () {
    //            return this["_miscData"] || "asdf";
    //        },
    //        set: function (value) {
    //            this["_miscData"] = value;
    //        },
    //        enumerable: true,
    //        configurable: true
    //    });
    //}


    
    //function makePropDescription(propName) {
    //    return {
    //        get: function () {
    //            return this["_" + propName];
    //        },
    //        set: function (value) {
    //            this["_" + propName] = value.toUpperCase();
    //        },
    //        enumerable: true,
    //        configurable: true
    //    };
    //}
    

})(breezeTestFns);