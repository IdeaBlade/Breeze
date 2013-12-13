(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    
    var Predicate = breeze.Predicate;
    var OrderByClause = breeze.OrderByClause;
    var MetadataStore = breeze.MetadataStore;
    var EntityType = breeze.EntityType;

    module("entityQuery ctor", {
        setup: function () {
            this.entities = [
                { id: 0, OrderDate: new Date(88, 1, 12), ShipCity: "Los Angeles", Size: 100 },
                { id: 1, OrderDate: new Date(88, 2, 12), ShipCity: "Chicago" },
                { id: 2, OrderDate: new Date(88, 9, 12), ShipCity: "Cannes", Size: 2000 },
                { id: 3, OrderDate: new Date(88, 10, 12), ShipCity: "Fargo", Size: 2000 },
                { id: 4, OrderDate: new Date(88, 11, 12), Size: 4000 },
                { id: 5, OrderDate: new Date(89, 1, 1), Size: 3000, ShipCity: "Fresno" }
            ];
            this.entities.forEach(function (e) {
                e.getProperty = function (p) { return this[p]; };
                e.setProperty = function (p, v) { this[p] = v; };
            });
        },
        teardown: function () {
        }
    });


    test("predicateBuilder simple toString()", function () {
        var p = new Predicate("Freight", ">", 100);
        var txt = p.toString();
        equal(txt, "{Freight} gt {100}");
        var p2 = Predicate.create("Freight", "gt", 100);
        var txt2 = p2.toString();
        equal(txt2, "{Freight} gt {100}");
        var p3 = new Predicate( "Freight", "==", 100);
        var txt3 = p3.toString();
        equal(txt3, "{Freight} eq {100}");
        var p4 = Predicate.create("Freight", "ne", 100);
        var txt4 = p4.toString();
        equal(txt4, "{Freight} ne {100}");
        var p5 = new Predicate("CompanyName", "stArtsWiTH", "B");
        var txt5 = p5.toString();
        equal(txt5, "{CompanyName} startswith {B}");
    });

    test("predicateBuilder simple toOData()", function () {
        var ms = new MetadataStore();
        var nullEt = new EntityType(ms);
        var dt = new Date(88, 9, 12);
        var dateStr = dt.toISOString(dt);
        var p = Predicate.create("OrderDate", ">", dt);
        var txt = p.toODataFragment(nullEt);
        equal(txt, "OrderDate gt datetime'" + dateStr + "'");
        var p2 = Predicate.create("OrderDate", "gt", dt);
        var txt2 = p2.toODataFragment(nullEt);
        equal(txt2, "OrderDate gt datetime'" + dateStr + "'");
        var p3 = Predicate.create("OrderDate", "==", dt);
        var txt3 = p3.toODataFragment(nullEt);
        equal(txt3, "OrderDate eq datetime'" + dateStr + "'");
        var p4 = new Predicate("OrderDate", "ne", dt);
        var txt4 = p4.toODataFragment(nullEt);
        equal(txt4, "OrderDate ne datetime'" + dateStr + "'");
        var p5 = new Predicate("ShipCity", "stArtsWiTH", "C");
        var txt5 = p5.toODataFragment(nullEt);
        equal(txt5, "startswith(ShipCity,'C') eq true");
    });

    test("predicateBuilder simple toFunction()", function () {
        var dt = new Date(88, 9, 12);
        var dateStr = dt.toISOString(dt);
        var ms = new MetadataStore();
        var nullEt = new EntityType(ms);

        var p1 = Predicate.create("OrderDate", ">", dt);
        var func1 = p1.toFunction(nullEt);
        var r1 = this.entities.filter(func1);
        ok(r1.length == 3);

        var p2 = Predicate.create("OrderDate", "Gt", dt);
        var func2 = p2.toFunction(nullEt);
        var r2 = this.entities.filter(func2);
        ok(core.arrayEquals(r1, r2));

        var p3 = Predicate.create("OrderDate", "==", dt);
        var func3 = p3.toFunction(nullEt);
        var r3 = this.entities.filter(func3);
        ok(r3.length == 1);

        var p4 = Predicate.create("OrderDate", "ne", dt);
        var func4 = p4.toFunction(nullEt);
        var r4 = this.entities.filter(func4);
        ok(r4.length == 5);

        var p5 = Predicate.create("ShipCity", "stArtsWiTH", "C");
        var func5 = p5.toFunction(nullEt);
        var r5 = this.entities.filter(func5);
        ok(r5.length == 2);
    });

    test("predicateBuilder composite", function () {

        var p1 = Predicate.create("ShipCity", "stArtsWiTH", "F")
            .and("Size", 'gt', 2000);
        var txt1 = p1.toString();
        equal(txt1, "({ShipCity} startswith {F}) and ({Size} gt {2000})");
        var p2 = p1.not();
        var txt2 = p2.toString();
        equal(txt2, "not (({ShipCity} startswith {F}) and ({Size} gt {2000}))");

    });


    test("predicateBuilder composite - toFunction", function () {
        var ms = new MetadataStore();
        var nullEt = new EntityType(ms);

        var p1 = Predicate.create("ShipCity", "startswith", "F").and("Size", "gt", 2000);
        var func1 = p1.toFunction(nullEt);
        var r1 = this.entities.filter(func1);
        ok(r1.length === 1);

        var p2 = p1.not();
        var func2 = p2.toFunction(nullEt);
        var r2 = this.entities.filter(func2);
        ok(r2.length === 5);

        var p3 = Predicate.create("ShipCity", "stArtsWiTH", "F").or("ShipCity", "startswith", "C")
            .and("Size", 'ge', 2000);
        var func3 = p3.toFunction(nullEt);
        var r3 = this.entities.filter(func3);
        ok(r3.length === 3);

        var p4 = p3.not();
        var func4 = p4.toFunction(nullEt);
        var r4 = this.entities.filter(func4);
        ok(r4.length === 3);
    });

    test("orderByClause - comparer", function () {
        var obc = OrderByClause.create(["ShipCity"]);
        ok(OrderByClause.isOrderByClause(obc), "should be an OrderByClause");
        var comparer = obc.getComparer();
        var ents = this.entities.sort(comparer);
        testFns.assertIsSorted(ents, "ShipCity", breeze.DataType.String, false, false);
        var obc2 = OrderByClause.create(["ShipCity"], true);
        comparer = obc2.getComparer();
        ents = this.entities.sort(comparer);
        testFns.assertIsSorted(ents, "ShipCity", breeze.DataType.String, true, false);
    });

    test("orderByClause - comparer - 2 parts", function () {
        var obc = OrderByClause.create(["Size","ShipCity"]);
        ok(OrderByClause.isOrderByClause(obc), "should be an OrderByClause");
        var comparer = obc.getComparer();
        this.entities.sort(comparer);
        var e1 = this.entities.slice(0);
        testFns.assertIsSorted(e1, "Size", breeze.DataType.Int32, false, false);
        var cities = e1.filter(makeFilter("Size", 2000)).map(core.pluck("ShipCity"));
        ok(core.arrayEquals(cities, ["Cannes", "Fargo"]));
        var obc2 = OrderByClause.create(["Size", "ShipCity"], true);
        comparer = obc2.getComparer();
        this.entities.sort(comparer);
        var e2 = this.entities.slice(0);
        testFns.assertIsSorted(e2, "Size", breeze.DataType.Int32, true, false);
        cities = e2.filter(makeFilter("Size", 2000)).map(core.pluck("ShipCity"));
        ok(core.arrayEquals(cities, ["Fargo", "Cannes"]));
    });

    function makeFilter(propName, value) {
        return function (obj) {
            return obj[propName] === value;
        };
    }


})(breezeTestFns);