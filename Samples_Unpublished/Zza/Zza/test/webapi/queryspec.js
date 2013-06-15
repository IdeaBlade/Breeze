xdescribe('breeze web api queries', function(){
    'use strict';
    var testFns = zzaTestFns;
    var breezeTest = testFns.breezeTest;
    var initialize = testFns.initialize;
    var failed = testFns.failed;
    var toFail = testFns.toFail;
    var newEm = testFns.newEm;
    testFns.addTestMatchers();

    var EntityQuery = breeze.EntityQuery;

    var async = new AsyncSpec(this);
    var xasync = testFns.xasync;

    describe('Simple queries', function() {
        async.it("should have lookups", function (done){
            breezeTest(lookupsQuery, done);
            var manager = newEm();
            function lookupsQuery(){
                return EntityQuery.from('Lookups')
                    .using(manager).execute().then(success);
            }
            function success(data) {
                var result = data.results[0];
                expect(result).toBeDefined();

                var orderStatuses = result.orderStatuses;
                expect(orderStatuses.length).toBeGreaterThan(0);
                console.log("OrderStatuses: "+orderStatuses.length);

                var products = result.products;
                expect(products.length).toBeGreaterThan(0);
                console.log("Products: "+products.length);

                var productOptions = result.productOptions;
                expect(productOptions.length).toBeGreaterThan(0);
                console.log("ProductOptions: "+productOptions.length);

                var productSizes = result.productSizes;
                expect(productSizes.length).toBeGreaterThan(0);
                console.log("ProductSizes: "+productSizes.length);
            }
        });

        async.it("should have customers", function (done){
            breezeTest(customersQuery, done);
            var manager = newEm();
            function customersQuery(){
                return EntityQuery.from('Customers')
                    .using(manager).execute().then(success);
            }
            function success(data) {
                var results = data.results;
                expect(results.length).toBeGreaterThan(0);
                console.log("Customers: "+results.length);
            }
        });

        async.it("should have at least 3 orders", function (done){
            breezeTest(ordersQuery, done);
            var manager = newEm();
            function ordersQuery(){
                return EntityQuery.from('Orders').take(3)
                    .using(manager).execute().then(success);
            }
            function success(data) {
                expect(data.results.length).toBeGreaterThan(2);
            }
        });
    });

    describe('Order queries', function() {
        async.it("an order should have items", function (done){
            breezeTest(orderOrderItemsQuery, done);
            var manager = newEm();
            function orderOrderItemsQuery(){
                return EntityQuery.from('Orders').expand('orderItems').take(1)
                    .using(manager).execute().then(success);
            }
            function success(data) {
                expect(data.results.length).toBeGreaterThan(0);
                var order = data.results[0];
                if (!order) return;
                var items = order.orderItems;
                expect(items.length).toBeGreaterThan(0);
            }
        });
    });
});
