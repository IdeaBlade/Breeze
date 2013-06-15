(function()  {

    'use strict';
    var testFns = zzaTestFns;
    var breezeTest = testFns.breezeTest;
    var initialized = testFns.initialized;
    var failed = testFns.failed;
    var toFail = testFns.toFail;
    var newEm = testFns.newEm;
    testFns.addTestMatchers();

    var EntityQuery = breeze.EntityQuery;

    var async = new AsyncSpec(this);

    describe('Web API queries', function(){

        async.it("should have lookups", function (done){
            breezeTest(query, done);
            var manager = newEm();
            function query(){
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
            breezeTest(query, done);
            var manager = newEm();
            function query(){
                return EntityQuery.from('Customers')
                    .using(manager).execute().then(success);
            }
            function success(data) {
                var results = data.results;
                expect(results.length).toBeGreaterThan(0);
                console.log("Customers: "+results.length);
            }
        });
    });

})();
