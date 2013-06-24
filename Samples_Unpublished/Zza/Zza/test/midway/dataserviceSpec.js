describe('dataservice', function () {
    'use strict';
    var ds, loggerStub, manager;
    var fns = zzaTestFns;
    var FakeLogger = fns.FakeLogger;
    var EntityState = breeze.EntityState;
    var async = new AsyncSpec(this);
    
    beforeEach(module('app'));

    beforeEach(function () {
        
        module(function ($provide) {
            loggerStub = sinon.stub(new FakeLogger);
            $provide.value('logger', loggerStub);
        });

        inject(function (entityManagerProvider) {
            var origFn = entityManagerProvider.newManager;
            entityManagerProvider.newManager = function () {               
                manager = origFn(); // test manager
                fns.addLookupsToManager(manager);
                fns.setManagerToFetchFromCache(manager);
                return manager;
            };
        });
    });

    beforeEach(inject(function (dataservice) {
        ds = dataservice;
    }));

    afterEach(function () {
        manager.clear(); // detach entities manager's entities
        manager = null; // free to GC
        ds = null;
    });

    it('should be created', function () {
        expect(ds).toBeTruthy();
    });
    
    it('should NOT have `Products` lookup UNTIL initialized', function () {
        expect(ds.products).toBeFalsy();
    });
    
    async.it('should have `Products` lookup after initialized()', function (done) {
        // note must use async test even though it only takes one tick
        ds.initialize().then(function () {
            assertDataServiceHasLookups();
            // sinon asserts don't work in Derek Bailey's tiny async test framework
            // the following would fail in sync test ... but won't here.
            //sinon.assert.calledWithMatch(loggerStub.info, /loaded from server/i);
            var call = loggerStub.info.firstCall;
            expect(call).toBeDefined();
            expect(call.args[0]).toMatch(/loaded from cache/i);
            done();
        }, failed);       
    });

    it('should have `Products` lookup after initializedSynchronously()', function () {
        ds.initializeSynchronously();
        assertDataServiceHasLookups();
    });

    it('should have empty cartOrder after init', function () {
        ds.initializeSynchronously();
        var order = ds.cartOrder;
        expect(order).toBeTruthy();
        expect(order.entityAspect.entityState).toBe(EntityState.Added);
        expect(order.orderItems.length).toEqual(0);
    });

    it('should have empty draftOrder after init', function () {
        ds.initializeSynchronously();
        var order = ds.draftOrder;
        expect(order).toBeTruthy();
        expect(order.entityAspect.entityState).toBe(EntityState.Added);
        expect(order.orderItems.length).toEqual(0);
    });

    function assertDataServiceHasLookups() {
        expect(ds.products).toBeTruthy();
        expect(ds.products.length).toBeGreaterThan(10);
    }
    
    function failed(error) {
        expect().toFail(error.message || error);
        done();
    }
});