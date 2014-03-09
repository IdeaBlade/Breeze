// ReSharper disable InconsistentNaming
// ReSharper disable UnusedLocals
(function (testFns) {
    "use strict";
    /*********************************************************
    * getEntityGraph 
    *********************************************************/
    function getEntityGraph(roots, expand) {
        var entityGroupMap, rootType;
        roots = Array.isArray(roots) ? roots : [roots];
        if (!roots.length) { return []; }
        getRootInfo();
        var expandFns = getExpandFns();
        var results = roots.slice();
        expandFns.forEach(function(fn) { fn(roots); });
        return results;

        function getRootInfo() {
            roots.forEach(function (root, ix) {
                var aspect;
                var getRootErr = function (msg) {
                    return new Error("'getEntityGraph' root[" + ix + "] " + msg);
                };

                if (!root || !(aspect = root.entityAspect)) {
                    throw getRootErr('is not an entity');
                }
                if (aspect.entityState === breeze.EntityState.Detached) {
                    throw getRootErr('is a detached entity');
                }
                if (rootType) {
                    if (rootType !== root.entityType) {
                        throw getRootErr("has a different 'EntityType' than other roots");
                    }
                } else {
                    rootType = root.entityType;
                }

                var em = aspect.entityManager;
                if (entityGroupMap) {
                    if (entityGroupMap !== em._entityGroupMap) {
                        throw getRootErr("has a different 'EntityManager' than other roots");
                    }
                } else {
                    entityGroupMap = em._entityGroupMap;
                }
            });
        }

        function getExpandFns() {
            try {
                if (!expand) {
                    return [];
                } else if (typeof expand === 'string') {
                    // tricky because Breeze expandClause not exposed publically
                    expand = new breeze.EntityQuery().expand(expand).expandClause;
                } 
                if (expand.propertyPaths) { // expand clause
                    expand = expand.propertyPaths;
                } else if (Array.isArray(expand)) {
                    if (!expand.every(function(elem) { return typeof elem === 'string'; })) {
                        throw '';
                    }
                } else {throw '';}
            } catch (_) {
                throw new Error(
                    "expand must be an expand string, an expand clause, or array of string paths");
            }

            var fns = expand.map(makePathFns);         
            return fns;
        }

        function makePathFns(path) {
            var fns = [],
                segments = path.split('.'),
                type = rootType;

            for (var i = 0, len = segments.length; i < len; i++) {
                var f = makePathFn(type, segments[i]);
                type = f.navType;
                fns.push(f);
            } 

            return function (entities) {
                for (var fi = 0, flen = fns.length; fi < len; fi++) {
                    var related = [];
                    f = fns[fi];
                    entities.forEach(function(entity) {
                        related = related.concat(f(entity));
                    });
                    entities = [];
                    var notLast = fi < flen - 1;
                    related.forEach(function (entity) {
                        if (results.indexOf(entity) < 0) {
                            results.push(entity);
                        }
                        if (notLast && entities.indexOf(entity) < 0) {
                            entities.push(entity);
                        }
                    });
                }
            };
        }

        function makePathFn(baseType, path) {
            var fn, navType;
            try {
                var baseTypeName = baseType.name;
                var nav = baseType.getNavigationProperty(path);
                navType = nav.entityType;
                var navTypeName = navType.name;
                var fkName = nav.foreignKeyNames[0];
                if (fkName) {
                    fn = function (entity) {
                        try {
                            var keyValue = entity.getProperty(fkName);
                            var grp = entityGroupMap[navTypeName];
                            if (grp) {
                                var val = grp._entities[grp._indexMap[keyValue]];
                                return val ? [val] : [];
                            } else {
                                return [];
                            }
                        } catch (_) {
                            throw new Error("can't expand '" + path + "' for " + baseTypeName);
                        }

                    };
                } else {
                    fkName = nav.inverse ?
                       nav.inverse.foreignKeyNames[0] :
                       nav.inverseForeignKeyNames[0];
                    if (!fkName) { throw ''; }
                    fn = function (entity) {
                        try {
                            var keyValue = entity.entityAspect.getKey().values[0];
                            var grp = entityGroupMap[navTypeName];
                            return grp ?
                                grp._entities.filter(function(e) {
                                    return e.getProperty(fkName) === keyValue;
                                }) : [];
                        } catch (_) {
                            throw new Error("can't expand '" + path + "' for " + baseTypeName);
                        }
                    };
                }
                fn.navType = navType;
                fn.path = path;
                return fn;

            } catch (ex) {
                throw new Error("'getEntityGraph' can't expand path=" + path);
            }
        }
    }

    /*********************************************************
    * Breeze configuration and module setup 
    *********************************************************/
    var breeze = testFns.breeze;
    var MetadataStore = breeze.MetadataStore;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityState = breeze.EntityState;

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
        var first = orders[0];
        var firstCust = first.getProperty('Customer');

        var graph = getEntityGraph(first, 'Customer');

        var k = graph.length === 2 &&
            graph[0] === first &&
            graph[1] === firstCust;
        ok(k, "should return one `Order`+ one `Customer`");
    });

    test("returns first order and its customer with expandClause", 1, function () {
        var query = new breeze.EntityQuery.from('Orders').expand('Customer');

        var first = orders[0];
        var firstCust = first.getProperty('Customer');

        var graph = getEntityGraph(first, query.expandClause);

        var k = graph.length === 2 &&
            graph[0] === first &&
            graph[1] === firstCust;
        ok(k, "should return one `Order`+ one `Customer`");
    });

    test("returns just first order with expand='Customer' when order.Customer is null", 2, function (){
        var first = orders[0];
        first.Customer = null;

        var graph = getEntityGraph(first, 'Customer');

        var k = graph.length === 1 && graph[0] === first;
        ok(k, "should return exactly one `Order`");
        equal(graph[0].entityAspect.entityState.name, breeze.EntityState.Modified.name,
            "the order should be 'Modified'");
    });

    test("first order returns no details with expand='OrderDetails'", 1, function () {
        var first = orders[0];
        var graph = getEntityGraph(first, 'OrderDetails');
        var k = graph.length === 1 && graph[0] === first;
        ok(k, "should return exactly one `Order`");
    });

    test("last order returns details with expand='OrderDetails'", 1, function () {
        var last = orders.pop();
        var detailsCount = last.getProperty('OrderDetails').length;

        var graph = getEntityGraph(last, 'OrderDetails');

        var details = graph.slice(1);
        var k = graph.length >= 2 &&
            graph[0] === last &&
            details.length === detailsCount &&
            details.every(function(d) {
                return d.entityType.shortName === 'OrderDetail';
            });
        ok(k, "should return one `Order` and its "+detailsCount+" `OrderDetails`");
    });

    test("last order returns details (including deleted) with expand='OrderDetails'", 3, function () {
        var last = orders.pop();
        var details = last.getProperty('OrderDetails');
        var detailsCount = details.length;
        details[0].entityAspect.setDeleted();

        equal(last.getProperty('OrderDetails').length, detailsCount - 1,
            "'OrderDetails nav returns one fewer because of deletion");

        var graph = getEntityGraph(last, 'OrderDetails');

        details = graph.slice(1);
        var k = graph.length >= 2 &&
            graph[0] === last &&
            details.length === detailsCount &&
            details.every(function (d) {
                return d.entityType.shortName === 'OrderDetail';
            });
        ok(k, "should return one `Order` and all " + detailsCount + " `OrderDetails`");
        var deleted = details.filter(function(d) {
            return d.entityAspect.entityState === breeze.EntityState.Deleted;
        });
        equal(deleted.length, 1, "one of the `OrderDetails` should be 'Deleted'");
    });

    test("last order returns customer and details with expand='Customer,OrderDetails'", 1, function () {
        var last = orders.pop();
        var lastCust = last.getProperty('Customer');
        var detailsCount = last.getProperty('OrderDetails').length;

        var graph = getEntityGraph(last, 'Customer, OrderDetails');

        var order = graph.shift();
        var customer = graph.shift();
        var details = graph;
        var k = order === last &&
            customer === lastCust &&
            details.length === detailsCount &&
            details.every(function (d) {
                return d.entityType.shortName === 'OrderDetail';
            });
        ok(k, "should return one `Order`, its `Customer` and its " +
            detailsCount + " `OrderDetails`");
    });


    test("first order returns just the order with expand='OrderDetails.Product'", 1, function () {
        var first = orders[0];
        var graph = getEntityGraph(first, 'OrderDetails.Product');
        var k = graph.length === 1 && graph[0] === first;
        ok(k, "should return exactly one `Order`");
    });

    test("last order returns the order, its customer, its details, and their products " +
         "with expand='OrderDetails.Product, Customer'", 5,
    function () {
        var last = orders.pop();
        var lastCust = last.getProperty('Customer');
        var lastDetails = last.getProperty('OrderDetails');
        var detailsCount = lastDetails.length;
        var lastProducts = [];
        lastDetails.forEach(function(d) {
            var p = d.getProperty('Product');
            if (lastProducts.indexOf(p) < 0) {
                lastProducts.push(p);
            }
        });
        var productCount = lastProducts.length;
        var expectedCount = 2 + detailsCount + productCount;

        var graph = getEntityGraph(last, 'OrderDetails.Product, Customer');

        equal(graph.length, expectedCount, 'graph count should be ' + expectedCount);

        var ords =  graph.filter(function(e) { return e.entityType.shortName === 'Order'; });
        equal(ords[ords.length - 1], last, "graph should have the last order");

        var cnt = graph.filter(function (e) { return e.entityType.shortName === 'OrderDetail'; }).length;
        equal(cnt, detailsCount, "graph should have "+detailsCount+ " `OrderDetails`");

        cnt = graph.filter(function (e) { return e.entityType.shortName === 'Product'; }).length;
        equal(cnt, detailsCount, "graph should have " + productCount + " distinct `Products`");

        var custs = graph.filter(function (e) { return e.entityType.shortName === 'Customer'; });
        equal(custs[custs.length - 1], lastCust, "graph should have last order's `Customer`");
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
        var custOrders = cust.getProperty('Orders');
        var custEmps = [];
        var custDetails = [];
        var custProducts = [];
        custOrders.forEach(function(ord) {
            var e = ord.getProperty('Employee');
            if (custEmps.indexOf(e)< 0) {
                custEmps.push(e);
            }
            var details = ord.getProperty('OrderDetails');
            custDetails = custDetails.concat(details);
            details.forEach(function (d) {
                var p = d.getProperty('Product');
                if (custProducts.indexOf(p) < 0) {
                    custProducts.push(p);
                }
            });
        });

        var orderCount = custOrders.length;
        var employeeCount = custEmps.length;
        var detailCount = custDetails.length;
        var productCount = custProducts.length;
        var expectedCount = 1 + orderCount + employeeCount + detailCount + productCount;

        var graph = getEntityGraph(cust, custExpand);

        // Asserts
        equal(graph.length, expectedCount, 'graph count should be ' + expectedCount);

        var custs = graph.filter(function (e) { return e.entityType.shortName === 'Customer'; });
        equal(custs[custs.length - 1], cust, "graph should have the first customer");

        var cnt = graph.filter(function (e) { return e.entityType.shortName === 'Order'; }).length;
        equal(cnt, orderCount, "graph should have " + orderCount + " orders");

        cnt = graph.filter(function (e) { return e.entityType.shortName === 'Employee'; }).length;
        equal(cnt, employeeCount, "graph should have " + employeeCount + " distinct employees");

        cnt = graph.filter(function (e) { return e.entityType.shortName === 'OrderDetail'; }).length;
        equal(cnt, detailCount, "graph should have " + detailCount + " details");

        cnt = graph.filter(function (e) { return e.entityType.shortName === 'Product'; }).length;
        equal(cnt, productCount, "graph should have " + productCount + " distinct products");
    }

    // works for self-referential type
    test("first employee should have 2 layers of direct reports", 3, function () {
        var first = employees[0];
        var seconds = first.getProperty('DirectReports');
        var thirds = [];
        seconds.forEach(function(emp) {
            thirds = thirds.concat(emp.getProperty('DirectReports'));
        });

        var reportsCount = seconds.length + thirds.length;

        var graph = getEntityGraph(first, 'DirectReports.DirectReports');

        equal(graph.length - 1, reportsCount, "should have " + reportsCount + " reports");

        var k = seconds.every(function (emp) { return graph.indexOf(emp) > -1; });
        ok(k, "its " + seconds.length + " direct reports are in the graph");

        k = thirds.every(function (emp) { return graph.indexOf(emp) > -1; });
        ok(k, "the " + thirds.length + " direct reports of its direct reports are in the graph");
    });

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
                    OrderID: orders[ordIx].OrderID,
                    ProductID: products[prodIx].ProductID,
                    Quantity: 1 + orderDetails.length
                }, UNCHGD));
        }
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