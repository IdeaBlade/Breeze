/* Zza/Breeze Web API queries */
xdescribe('Zza/Breeze web api', function(){
    'use strict';
    var breezeTest = testFns.breezeTest;
    var newEm = testFns.newEm;
    var EntityQuery = breeze.EntityQuery;

    var async = new AsyncSpec(this);
    var xasync = testFns.xasync;

    describe('simple queries', function() {
        async.it("should have lookups", function (done){
            breezeTest(lookupsQuery, done);

            function lookupsQuery(){
                var em = newEm();
                return EntityQuery.from('Lookups')
                    .using(em).execute().then(success);
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

            function customersQuery(){
                var em = newEm();
                return EntityQuery.from('Customers')
                    .using(em).execute().then(success);
            }
            function success(data) {
                var results = data.results;
                expect(results.length).toBeGreaterThan(0);
                console.log("Customers: "+results.length);
            }
        });

        async.it("should have at least 3 orders", function (done){
            breezeTest(ordersQuery, done);

            function ordersQuery(){
                var em = newEm();
                return EntityQuery.from('Orders').take(3)
                    .using(em).execute().then(success);
            }
            function success(data) {
                expect(data.results.length).toBeGreaterThan(2);
            }
        });
    });

    describe('Order queries', function() {
        async.it("an order should have items", function (done){
            breezeTest(orderOrderItemsQuery, done);

            function orderOrderItemsQuery(){
                var em = newEm();
                return EntityQuery.from('Orders').expand('orderItems').take(1)
                    .using(em).execute().then(success);
            }
            function success(data) {
                var order = data.results[0];
                var items = order.orderItems;
                expect(items.length).toBeGreaterThan(0);
            }
        });

        async.it("can navigate from order to cached parent customer", function (done){
            var em;
            breezeTest(test, done);

            function test(){
                em = newEm();
                return customersQuery().then(orderQuery).then(testTheOrder);
            }
            function customersQuery(){
                //return Q(true);  // will fail if we don't get customers first
                return EntityQuery.from('Customers').using(em).execute();
            }
            function orderQuery(){
                return EntityQuery.from('Orders').take(1).using(em).execute();
            }
            function testTheOrder(data) {
                var order = data.results[0];
                var customer = order.customer;
                expect(customer).toBeTruthy();
            }
        });
    });
});
