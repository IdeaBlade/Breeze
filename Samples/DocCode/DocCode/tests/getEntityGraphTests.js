// ReSharper disable InconsistentNaming
// ReSharper disable UnusedLocals
(function (testFns) {
    "use strict";

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var breeze = testFns.breeze;
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityState = breeze.EntityState;
    var getEntityGraph = EntityManager.getEntityGraph;

    var customers, employees, manager, orders, orderDetails, products;
    var moduleMetadataStore = new MetadataStore();
    var northwindService = testFns.northwindServiceName;
    var handleFail = testFns.handleFail;

    var defaultModelLibraryName = breeze.config.getAdapterInstance('modelLibrary').name;
    var testModelLibraryName = 'backingStore';

    module("getEntityGraphTests", { setup: setup, teardown: teardown });

    function setup() {
        setModelLibrary(testModelLibraryName);
        moduleMetadataStoreSetup(function() {
            manager = new newEm();
            addTestEntities();
        });
    }

    function teardown() {
        setModelLibrary(defaultModelLibraryName);
    }

    test("returns empty graph when no roots (regardless of expand)", 1, function () {
        var graph = getEntityGraph([], 'Customer');
        equal(graph.length, 0, "should return empty array");
    });

    test("returns all orders when no expand", 1, function () {
        var graph = getEntityGraph(orders);
        equal(graph.length, orders.length,
            "should return same length as `orders`, " + orders.length);
    });

    test("all orders with expand='Customer' returns orders and their customers", 1, function () {
        var graph = getEntityGraph(orders, 'Customer');
        var expectedLength = orders.length + customers.length;
        equal(graph.length, expectedLength,
            "should return same length as `orders`+`customers`, " + expectedLength);
    });

    test("returns first order and its customer with expand='Customer'", 1, function () {
        var order = orders[0];
        var orderCust = order.getProperty('Customer');

        var graph = getEntityGraph(order, 'Customer');

        var k = graph.length === 2 &&
            graph.indexOf(order) > -1 &&
            graph.indexOf(orderCust) > -1;
        ok(k, "should return one `Order`+ one `Customer`");
    });

    test("returns first order and its customer with expandClause", 1, function () {
        var query = new breeze.EntityQuery.from('Orders').expand('Customer');

        var order = orders[0];
        var orderCust = order.getProperty('Customer');

        var graph = getEntityGraph(order, query.expandClause);

        var k = graph.length === 2 &&
            graph.indexOf(order) > -1 &&
            graph.indexOf(orderCust) > -1;
        ok(k, "should return one `Order`+ one `Customer`");
    });

    test("returns just first order with expand='Customer' when order.Customer is null", 2, function (){
        var order = orders[0];
        order.setProperty('Customer', null);

        var graph = getEntityGraph(order, 'Customer');

        var k = graph.length === 1 && graph[0] === order;
        ok(k, "should return exactly one `Order` (the first)");
        equal(graph[0].entityAspect.entityState.name, breeze.EntityState.Modified.name,
            "the order should be 'Modified'");
    });

    test("first order returns no details with expand='OrderDetails'", 1, function () {
        var order = orders[0];
        var graph = getEntityGraph(order, 'OrderDetails');
        var k = graph.length === 1 && graph[0] === order;
        ok(k, "should return exactly one `Order` (the first)");
    });

    test("last order returns details with expand='OrderDetails'", 3, function () {
        var order = orders.pop();
        var orderdetails = order.getProperty('OrderDetails');

        var graph = getEntityGraph(order, 'OrderDetails');

        assertCount(graph, 1 + orderdetails.length);
        assertAllInNoDups(graph, order, "order (the last)");
        assertAllInNoDups(graph, orderdetails, " order details");
    });

    test("last order returns details (including deleted) with expand='OrderDetails'", 4,
    function () {
        var order = orders.pop();
        var orderdetails = order.getProperty('OrderDetails').slice();
        orderdetails[0].entityAspect.setDeleted();

        var graph = getEntityGraph(order, 'OrderDetails');

        assertCount(graph, 1 + orderdetails.length);
        assertAllInNoDups(graph, order, "order (the last)");
        assertAllInNoDups(graph, orderdetails, " order details");
        equal(order.getProperty('OrderDetails').length, orderdetails.length - 1,
             "'order.OrderDetails' returns one fewer because of deletion");
    });

    test("last order returns customer and details with expand='Customer,OrderDetails'", 4,
    function () {
        var order = orders.pop();
        var orderCust = order.getProperty('Customer');
        var orderdetails = order.getProperty('OrderDetails');

        var graph = getEntityGraph(order, 'Customer, OrderDetails');

        var expectedCount = 2 + orderdetails.length;
        assertCount(graph, expectedCount);
        assertAllInNoDups(graph, order, "order (the last)");
        assertAllInNoDups(graph, orderCust, "order customer");
        assertAllInNoDups(graph, orderdetails, " order details");
    });

    test("first order returns just the order with expand='OrderDetails.Product'", 1, function () {
        var order = orders[0];
        var graph = getEntityGraph(order, 'OrderDetails.Product');
        var k = graph.length === 1 && graph[0] === order;
        ok(k, "should return exactly one `Order`");
    });

    test("last order returns the order, its customer, its details, and their products " +
         "with expand='OrderDetails.Product, Customer'", 5,
    function () {
        var order = orders.pop();
        var orderCust = order.getProperty('Customer');
        var orderdetails = order.getProperty('OrderDetails');
        var prods = orderDetails.map(function (d) { return d.getProperty('Product'); });
        var orderProducts = addDistinct(prods);

        var graph = getEntityGraph(order, 'OrderDetails.Product, Customer');

        var expectedCount = 2 + orderdetails.length + orderProducts.length;
        assertCount(graph, expectedCount);
        assertAllInNoDups(graph, order, "order (the last)");
        assertAllInNoDups(graph, orderCust, "order customer");
        assertAllInNoDups(graph, orderdetails, " order details");
        assertAllInNoDups(graph, orderProducts, " distinct order products");
    });

    // Compact expand
    var custExpand = 'Orders.OrderDetails.Product, Orders.Employee';
    test("first customer returns its orders, their employees, their details, and their products " +
        "with compact expand='" + custExpand + "'", 6, function () {
        customerExpandTest();
    });

    // Verbose expand
    custExpand = 'Orders, Orders.OrderDetails, Orders.OrderDetails.Product, Orders.Employee';
    test("first customer returns its orders, their employees, their details, and their products " +
        "with verbose expand='" + custExpand + "'", 6, function () {
            customerExpandTest();
        });

    function customerExpandTest () {
        // setup
        var cust = customers[0];
        var custEmps = [];
        var custDetails = [];
        var custProducts = [];
        var custOrders = cust.getProperty('Orders');
        custOrders.forEach(function(ord) {
            addDistinct(ord.getProperty('Employee'), custEmps);
            var details = ord.getProperty('OrderDetails');
            var prods = details.map(function(d) { return d.getProperty('Product'); });
            addDistinct(prods, custProducts);
            custDetails = custDetails.concat(details);
        });

        var graph = getEntityGraph(cust, custExpand);

        // Asserts
        var expectedCount = 1 + custOrders.length + custEmps.length +
            custDetails.length + custProducts.length;
        assertCount(graph, expectedCount);
        assertAllInNoDups(graph, cust, "customer (the first)");
        assertAllInNoDups(graph, custOrders, "orders");
        assertAllInNoDups(graph, custEmps, "distinct order employees");
        assertAllInNoDups(graph, custDetails, " order details");
        assertAllInNoDups(graph, custProducts, " distinct order products");
    }

    // works for self-referential type
    test("first employee should have 2 layers of direct reports", 3, function () {
        var first = employees[0];
        var seconds = first.getProperty('DirectReports');
        var thirds = [];
        seconds.forEach(function(emp) {
            thirds = thirds.concat(emp.getProperty('DirectReports'));
        });

        var graph = getEntityGraph(first, 'DirectReports.DirectReports');

        assertCount(graph, 1 + seconds.length + thirds.length);
        assertAllInNoDups(graph, seconds, "direct reports");
        assertAllInNoDups(graph, thirds, "direct reports of its direct reports");
    });

    // get graph from a Customer expand query; requires a manager instance
    test("customer query with 'Orders.OrderDetails' returns graph with orders & details", 4, function () {
        var cust = customers[0];

        var query = breeze.EntityQuery.from('Customers')
                    .where('CompanyName', 'eq', cust.getProperty('CompanyName'))
                    .expand('Orders.OrderDetails');

        customerQueryTest(cust, query);
    });

    // get graph from a Customer query but override expand; requires a manager instance
    test("customer query with separate expand spec returns graph with orders & details", 4, function () {
        var cust = customers[1];

        var query = breeze.EntityQuery.from('Customers')
            .where('CompanyName', 'eq', cust.getProperty('CompanyName'))
            .expand('Orders.Employee'); // WILL OVERRIDE THIS EXPAND
        customerQueryTest(cust, query, 'Orders.OrderDetails');
    });

    function customerQueryTest(cust, query, expand) {
        var custOrders = cust.getProperty('Orders');
        var custDetails = [];
        custOrders.forEach(function (o) {
            custDetails = custDetails.concat(o.getProperty('OrderDetails'));
        });

        var graph = manager.getEntityGraph(query, expand);

        var expectedCount = 1 + custOrders.length + custDetails.length;
        assertCount(graph, expectedCount);
        assertAllInNoDups(graph, cust, "customer = "+cust.getProperty('CompanyName'));
        assertAllInNoDups(graph, custOrders, "customer orders");
        assertAllInNoDups(graph, custDetails, "customer order details");
    }

    /*********************************************************
     * Error cases
    *********************************************************/
    test("should error if root is not an entity", 1, function () {
        throws(function () {
            var graph = getEntityGraph({}, 'OrderDetails');
        }, /not an entity/, "throws 'not an entity' error");
    });

    test("should error if root detached", 1, function () {
        var order = orders.pop();
        order.entityAspect.setDetached();
        throws(function() {
            var graph = getEntityGraph(order, 'OrderDetails');
        }, /detached/, "throws 'detached' error");
    });

    test("should error if mixed type roots", 1, function () {
        var order = orders.pop();
        var customer = customers.pop();
        throws(function () {
            var graph = getEntityGraph([order, customer],'OrderDetails');
        }, /entitytype/i, "throws mixed 'EntityType' error");
    });

    test("should error if roots have different managers", 1, function() {
        var order1 = orders[0];
        var em2 = manager.createEmptyCopy();
        var imports = em2.importEntities(manager.exportEntities([orders[1]], false));
        var order2 = imports.entities[0];

        throws(function() {
            var graph = getEntityGraph([order1, order2], 'OrderDetails');
        }, /entitymanager/i, "throws mixed EntityManager error");
    });

    test("should error if bad expand object", 1, function () {
        var order = orders.pop();
        throws(function () {
            var graph = getEntityGraph(order, ["this", 2, "that"]);
        }, /must be an expand/, "throws 'must be an expand' error");
    });

    test("should error if invalid expand path", 1, function () {
        var order = orders.pop();
        throws(function () {
            var graph = getEntityGraph(order, 'details');
        }, /can't expand/, "throws 'can\'t expand' error");
    });

    /*********************************************************
     * helpers
    *********************************************************/

    function addDistinct(input, results) {
        results = results || [];
        input = Array.isArray(input) ? input : [input];
        input.forEach(function (item) {
            if (item != null && results.indexOf(item) < 0) {
                results.push(item);
            }
        });
        return results;
    }

    function addTestEntities() {
        var UNCHGD = breeze.EntityState.Unchanged;

        customers = [1,2].map(function (ix) {
            return manager.createEntity('Customer', {
                CustomerID: testFns.newGuidComb(),
                CompanyName: 'Customer ' + ix
            }, UNCHGD);
        });

        var reportsTo = [null, 1, 1, 2, 2, 3, 5];
        employees = [1, 2, 3, 4, 5, 6, 7].map(function (id) {
            return manager.createEntity('Employee', {
                EmployeeID: id,
                FirstName: 'First ' + id,
                LastName: 'Last ' + id,
                ReportsToEmployeeID: reportsTo[id-1]
            }, UNCHGD);
        });

        var ordIds = [1, 2, 3, 4, 5, 6];
        var custIx = -1, custLen = customers.length,
            empIx = -1, empLen = Math.min(3,employees.length);
        orders = ordIds.map(function (id) {
            custIx += 1;
            empIx += 1;
            return manager.createEntity('Order', {
                OrderID: id,
                Customer: customers[custIx < custLen ? custIx : custIx = 0 ],
                Employee: employees[empIx < empLen ? empIx : empIx = 0 ],
                ShipName: 'ShipName ' + id
            }, UNCHGD);
        });

        // Create as many products as orders (actually need one fewer)
        products = ordIds.map(function (id) {
            return manager.createEntity('Product', {
                ProductID: id,
                ProductName: 'Product ' + id
            }, UNCHGD);
        });

        orderDetails = [];        
        for (var ordIx = 0, ordLen = orders.length; ordIx < ordLen; ordIx++) {
            for (var prodIx = 0; prodIx < ordIx; prodIx++)
                orderDetails.push( manager.createEntity('OrderDetail', {
                    OrderID: orders[ordIx].getProperty('OrderID'),
                    ProductID: products[prodIx].getProperty('ProductID'),
                    Quantity: 1 + orderDetails.length
                }, UNCHGD));
        }
    }

    function assertAllInNoDups(dest, src, srcDescription) {
        src = Array.isArray(src) ? src : [src];
        var srcCount = src.length;
        var bad = []; // for debugging
        src.forEach(function (s) {
            if (s == null) {
                srcCount -= 1;
            } else {
                var miss = dest.filter(function (d) { return d === s; });
                if (miss.length !== 1) { bad = bad.push(s); }
            }
        });
        var message = 'should have ' + srcCount + ' ' + srcDescription + '.';
        equal(bad.length, 0, message);
    }

    function assertCount(array, expectedCount, description) {
        description = description || 'graph';
        equal(array.length, expectedCount, description +
            " count should be " + expectedCount);
    }

    // Populate the moduleMetadataStore with Northwind service metadata
    function moduleMetadataStoreSetup(callback) {
        if (!moduleMetadataStore.isEmpty()) { // got it already
            callback();
            return;
        } 

        stop(); // going async for metadata ...
        moduleMetadataStore.fetchMetadata(northwindService)
            .then(callback)
            .fail(handleFail)
            .fin(start);
    }

    function newEm(metadataStore) {
        return new EntityManager({
            serviceName: northwindService,
            metadataStore: metadataStore || moduleMetadataStore
        });
    }

    function setModelLibrary(name) {
        var current = breeze.config.getAdapterInstance('modelLibrary').name;
        if (name !== current) {
            breeze.config.initializeAdapterInstance("modelLibrary", name);
        }
    }
})(docCode.testFns);