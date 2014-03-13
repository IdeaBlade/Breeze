(function (testFns) {
    var breeze = testFns.breeze;
    var core = breeze.core;
    
    var MetadataStore = breeze.MetadataStore;

    var Enum = core.Enum;
    var EntityManager = breeze.EntityManager;
    var EntityQuery = breeze.EntityQuery;
    var EntityType = breeze.EntityType;
    var NamingConvention = breeze.NamingConvention;

    var newEm = testFns.newEm;

    module("misc", {
        setup: function () {
            testFns.setup();
        },
        teardown: function () {

        }
    });

    var toJSONSafe = core.toJSONSafe;

   

    function testNcRoundTrip(nc, name, isClientName) {
        if (isClientName) {
            var sName = nc.clientPropertyNameToServer(name, parent);
            var testName = nc.serverPropertyNameToClient(sName, parent);
        } else {
            var cName = nc.serverPropertyNameToClient(name, parent);
            var testName = nc.clientPropertyNameToServer(name, parent);
        }
        Assert.IsTrue(testName == name, "unable to roundtrip from " + (isClientName ? 'client' : 'server') + " name: " + name);
    }

    test("toJSONSafe", function () {
        var o = {
            a: 1,
            b: null,
            c: true,
            d: false,
            e: { e1: "xxx", e2: { e21: 33, e22: undefined, e23: null } },
            f: ["adfasdf", 3, null, undefined, { f1: 666, f2: "adfasf", f3: false }]
        };
        var o1 = toJSONSafe(o);
        checkJSONSafe(o1);
        var s1 = JSON.stringify(o1);

        o.e.e2.x = o;
        o1 = toJSONSafe(o)
        checkJSONSafe(o1);
        s1 = JSON.stringify(o1);
        ok(o1.e.e2.x === undefined);
        delete o.e.e2.x;

        o.f.push(o);
        o1 = toJSONSafe(o)
        checkJSONSafe(o1);
        s1 = JSON.stringify(o1);
        ok(o1.f[o1.f.length-1] === undefined);
        ok(o1.f[1] === 3)
        
    });

    function checkJSONSafe(o1) {
        ok(o1.e.e2.e21 === 33);
        ok(o1.e.e2.e23 === null);
        ok(o1.e.e2.e22 === undefined); // interesting case.
        ok(!("e22" in o1.e.e2));
        ok(o1.f[4].f2 === "adfasf");
    }

    test("hasCycles", function () {
        var o = {
            a: 1,
            b: null,
            c: true,
            d: false,
            e: { e1: "xxx", e2: { e21: 33, e22: undefined, e23: null } },
            f: ["adfasdf", 3, null, undefined, { f1: 666, f2: "adfasf", f3: false }]
        };
        var hasCycles = __hasCycles(o);
        ok(!hasCycles, "should not have cycles");
        o.e.e2.x = o;
        hasCycles = __hasCycles(o);
        ok(hasCycles, "should have cycles");
        delete o.e.e2.x;
        var hasCycles = __hasCycles(o);
        ok(!hasCycles, "should not have cycles");
        o.f.push(o);
        hasCycles = __hasCycles(o);
        ok(hasCycles, "should have cycles");
    });

    //function toJSONSafe(obj) {
    //    if (obj !== Object(obj)) return obj; // primitive value
    //    if (obj._$visited) return undefined;
    //    if (obj.toJSON) {
    //        obj = obj.toJSON();
    //    }
    //    obj._$visited = true;
    //    var result;
    //    if (obj instanceof Array) {
    //        result = obj.map(toJSONSafe);
    //    } else if (typeof (obj) === "function") {
    //        result = undefined;
    //    } else {
    //        var result = {};
    //        for (var prop in obj) {
    //            if (prop === "_$visited") continue;
    //            var val = toJSONSafe(obj[prop]);
    //            if (val === undefined) continue;                   
    //            result[prop] = val;
    //        }
    //    }
    //    delete obj._$visited;
    //    return result;
    //}
    
    function __hasCycles(obj) {
        if (obj !== Object(obj)) return false; // primitive value
        if (obj._$visited) return true;
        obj._$visited = true;
        var result = false;
        if (obj instanceof Array) {
            result = obj.some(__hasCycles);
        } else {
            for (var prop in obj) {
                if (__hasCycles(obj[prop])) {
                    result = true;
                    break;
                }
            }
        }
        delete obj._$visited;
        return result;
    }

    test("module with setup/teardown", function () {
        expect(1);
        ok(true);
    });
    
    test("mock metaDataService", function() {

        if (testFns.modelLibrary == "backbone") {
            ok(true, "NOT APPLICABLE");
            return;
        }

        //1st step
        var mockDataService = new breeze.DataService({
            serviceName: "mockDataService",
            hasServerMetadata: false
        });

        var mockMetadataStore = new breeze.MetadataStore(
            {
                namingConvention: breeze.NamingConvention.camelCase
            });

        var queryOptions = new breeze.QueryOptions({
            fetchStrategy: breeze.FetchStrategy.FromLocalCache
        });

        var entityManager = new breeze.EntityManager({
            dataService: mockDataService,
            metadataStore: mockMetadataStore,
            queryOptions: queryOptions
        });
        // 2nd step
        var et = new breeze.EntityType({
            shortName: "Tag",
            namespace: "Football.Models",
            autoGeneratedKeyType: breeze.AutoGeneratedKeyType.Identity,
            defaultResourceName: "Tag"
        });
        et.addProperty(new breeze.DataProperty({
            name: "id",
            dataType: breeze.DataType.Int32,
            isNullable: false,
            isPartOfKey: true
        }));
        et.addProperty(new breeze.DataProperty({
            name: "name",
            dataType: breeze.DataType.String,
            isNullable: false
        }));
        mockMetadataStore.addEntityType(et);
        mockMetadataStore.registerEntityTypeCtor("Tag", null);

        // mockMetadataStore.setEntityTypeForResourceName("Tag", et);
        // mockMetadataStore.addDataService(mockDataService);
        
        //3rd step 
        var etType = mockMetadataStore.getEntityType("Tag");
        var newTag = etType.createEntity({ id: 1, name: "tag" });
        entityManager.addEntity(newTag);
        // 4th step
        stop();
        breeze.EntityQuery.from("Tag").using(entityManager).execute().then(function(data) {
            var r = data.results;
            ok(r.length > 0, "Should have returned some results");
        }).fail(function(err) {
            ok(false, "should not get here");
        }).fin(start);

    });;


    test("isDate", function() {
        var a = null;
        ok(!core.isDate(a), "x should not be a date");
        var zzz = undefined;
        ok(!core.isDate(zzz), "zzzz should not be date");
        var dt1 = new Date();
        ok(core.isDate(dt1), "dt1 should be a date");
        var dt2 = new Date("xxx");
        ok(!core.isDate(dt2), "dt2 is not a date");
    });
    
    var factors = [31104000, // year (360*24*60*60) 
          2592000,             // month (30*24*60*60) 
          86400,               // day (24*60*60) 
          3600,                // hour (60*60) 
          60,                  // minute (60) 
          1];                  // second (1)

    test("durationToSeconds", function() {
        var secs = core.durationToSeconds("PT1S");
        ok(secs === 1, "should be 1");
        secs = core.durationToSeconds("PT3H20M1S");
        ok(secs === (3 * 60 * 60) + (20 * 60) + 1);
        secs = core.durationToSeconds("P2Y1MT20M1S");
        ok(secs === ((2 * factors[0]) + (1 * factors[1]) + (20 * factors[4]) + 1));
    });

    test("backbone", function() {
        var Person = Backbone.Model.extend({});
        var aPerson = new Person();
        ok(aPerson instanceof Person);

    });
    
    test("date comparison", function () {
        var dt1 = new Date();
        var dt2 = new Date(dt1.getTime());
        ok(dt1 != dt2);
        ok(dt1 !== dt2);
        ok(dt1 >= dt2);
        ok(dt1 <= dt2);
        
    });

    test("iso date conversion", function() {
        var dt1 = new Date(Date.now());
        ok(core.isDate(dt1));
        var dt1AsString = dt1.toISOString();
        var dt1a = new Date(Date.parse(dt1AsString));
        // var dt1a = core.dateFromIsoString(dt1AsString);
        ok(dt1.getTime() === dt1a.getTime());
    });

    test("regex function matching", function () {
        // hacking into FnNode - just for testing - this is not the way these would ever get used in a real app.
        var entity = new TestEntity();
        var ms = new MetadataStore();
        var mt = new EntityType(ms);
        var fo = breeze.FilterQueryOp.Equals;

        // fo is only needed in this one case.
        var node0 = breeze.FnNode.create("CompanyName", mt, fo);
        var val0 = node0.fn(entity);
        ok(val0 == "Test Company 1");
        
        var node1 = breeze.FnNode.create("substring(toUpper(CompanyName), length('adfasdf'))", mt);
        var val1 = node1.fn(entity);
        ok(val1 === 'MPANY 1');
        var url1 = node1.toODataFragment(mt);

        var node2 = breeze.FnNode.create("substring(toUpper(toLower(CompanyName)), length('adfa,sdf'))", mt);
        var val2 = node2.fn(entity);
        var url2 = node2.toODataFragment(mt);
        
        var node3 = breeze.FnNode.create("substring(substring(toLower(CompanyName), length('adf,asdf')),5)", mt);
        var val3 = node3.fn(entity);
        var url3 = node3.toODataFragment(mt);

        var node4 = breeze.FnNode.create("substring(CompanyName, length(substring('xxxxxxx', 4)))", mt);
        var val4 = node4.fn(entity);
        var url4 = node4.toODataFragment(mt);
        
    });

    var TestEntity = function() {
        this.CompanyName = "Test Company 1";
        
    };
    
    TestEntity.prototype.getProperty = function(propName) {
        return this[propName];
    };
    
    

    test("dual purpose func and object", function () {
        var fn = function () {
        };
        var obj = {};
        obj["foo"] = fn;
        obj["foo"]["bar"] = 999;
        ok(999 === obj.foo.bar);
        ok(obj.foo() === undefined);
    });

    test("attaching a property to a string is a noop", function () {
        var foo = "abcd";
        foo.extra = "efgh";
        var extra = foo.extra;
        ok(extra === undefined);
    });


    test("createFromPrototype semantics", function () {
        var literal1 = { a: 1, b: 2 };
        var literal2 = { a: 999, b: 1000 };
        var proto = {
            nextId: 1,
            increment: function () {
                this.a = this.a + 1;
            }
        };
        var newLit1 = createFromPrototype(proto, literal1);
        var newLit2 = createFromPrototype(proto, literal2);
        newLit1.increment();
        ok(newLit1.a === 2);

    });

    test("createFromPrototype semantics2", function () {
        var p1Data = { age: 10, hair: "brown" };
        var p2Data = { age: 20, hair: "red" };


        var person = {
            nextId: 1,
            incrementAge: function () {
                this.age = this.age + 1;
            }
        };

        var male = {
            sex: "M"
        };

        var man = createFromPrototype(person, male);

        var man1 = createFromPrototype(man, p1Data);
        var man2 = createFromPrototype(man, p2Data);

        man1.incrementAge();
        ok(man1.age === 11);
        ok(man2.sex === "M");
        ok(man.isPrototypeOf(man1));
        ok(person.isPrototypeOf(man1));

    });

    function notest() {
    }

    test("Chrome defineProperty bug - bad behavior", function () {
        var Person = function (firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
        };

        var proto = Person.prototype;

        var earlyPerson = new Person("early", "person");

        function makePropDescription(propName) {
            return {
                get: function () {
                    return this["_" + propName];
                },
                set: function (value) {
                    this["_" + propName] = value.toUpperCase();
                },
                enumerable: true,
                configurable: true
            };
        }

        Object.defineProperty(proto, "firstName", makePropDescription("firstName"));
        ok(earlyPerson.firstName === "early");
        var p1 = new Person("jim", "jones");
        var p2 = new Person("bill", "smith");
        ok(p1.firstName === "JIM");
        ok(p2.firstName === "BILL");
    });

    test("IE 9 defineProperty bug - better workaround", function () {
        var Person = function (firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
        };

        var proto = Person.prototype;
        proto._pendingSets = [];
        proto._pendingSets.schedule = function (entity, propName, value) {
            this.push({ entity: entity, propName: propName, value: value });
            if (!this.isPending) {
                this.isPending = true;
                var that = this;
                setTimeout(function () { that.process(); });
            }
        };
        proto._pendingSets.process = function () {
            if (this.length === 0) return;
            this.forEach(function (ps) {
                if (!ps.entity._backingStore) {
                    ps.entity._backingStore = {};
                }
                ps.entity[ps.propName] = ps.value;
            });
            this.length = 0;
            this.isPending = false;
        };

        function makePropDescription(propName) {
            return {
                get: function () {
                    var bs = this._backingStore;
                    if (!bs) {
                        proto._pendingSets.process();
                        bs = this._backingStore;
                        if (!bs) return;
                    }
                    return bs[propName];
                },
                set: function (value) {
                    var bs = this._backingStore;
                    if (!bs) {
                        proto._pendingSets.schedule(this, propName, value);
                    } else {
                        bs[propName] = value ? value.toUpperCase() : null;
                    }
                },
                enumerable: true,
                configurable: true
            };
        }

        Object.defineProperty(proto, "firstName", makePropDescription("firstName"));

        var p1 = new Person("jim", "jones");
        // fails on next line
        var p2 = new Person("bill", "smith");
        var p3 = new Person();
        var p1name = p1.firstName;
        var p3name = p3.firstName;
        p3.firstName = "fred";

        ok(p1.firstName === "JIM");
        ok(p2.firstName === "BILL");


    });

    // change to test to see it crash in ie. - works in Chrome and FF.
    notest("IE 9 defineProperty bug - CRASH", function () {
        var Person = function (firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
        };

        var proto = Person.prototype;

        function makePropDescription(propName) {
            return {
                get: function () {
                    if (!this.backingStore) {
                        this.backingStore = {};
                    }
                    return this.backingStore[propName];
                },
                set: function (value) {
                    if (!this.backingStore) {
                        this.backingStore = {};
                    }
                    if (value) {
                        this.backingStore[propName] = value.toUpperCase();
                    }
                    ;
                },
                enumerable: true,
                configurable: true
            };
        }


        Object.defineProperty(proto, "firstName", makePropDescription("firstName"));

        var p1 = new Person("jim", "jones");
        // fails on next line
        var p2 = new Person("bill", "smith");
        ok(p1.firstName === "JIM");
        ok(p2.firstName === "BILL");


    });


    test("ie defineProperty bug - workaround", function () {
        var Person = function (firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;

        };
        var proto = Person.prototype;

        var earlyPerson = new Person("early", "person");

        Object.defineProperty(proto, "firstName", makePropDescription("firstName"));
        proto._backups = [];

        function getBackingStore(obj) {
            // idea here is that we CANNOT create a new property on 'this' from
            // within property getter/setter code. IE has real issues with it.
            var bs = obj._backingStore;
            if (bs) return bs;
            var prt = Object.getPrototypeOf(obj);
            var backups = prt._backups;

            var matchingBackup = core.arrayFirst(backups, function (backup) {
                return backup.obj === obj;
            });
            if (matchingBackup) {
                bs = matchingBackup.backingStore;
            } else {
                bs = {};
                backups.push({ obj: obj, backingStore: bs });
            }
            if (backups.length > 3) {
                setTimeout(function () {
                    updateBackingStores(prt);
                }, 0);
            }
            return bs;
        }

        // needed for chrome.

        function startTracking(obj) {
            updateBackingStores(Object.getPrototypeOf(obj));
            // rest is needed for Chrome.
            if (obj._backingStore) return;
            obj._backingStore = {};
            Object.getOwnPropertyNames(obj).forEach(function (propName) {
                if (propName === '_backingStore') return;
                // next 3 lines insure any interception logic is hit.
                var value = obj[propName];
                delete obj[propName];
                obj[propName] = value;
            });
        }

        function updateBackingStores(proto) {
            if (proto._backups.length === 0) return;
            proto._backups.forEach(function (backup) {
                if (!backup.obj._backingStore) {
                    backup.obj._backingStore = backup.backingStore;
                }
            });
            proto._backups.length = 0;
        }

        function makePropDescription(propName) {
            return {
                get: function () {
                    var bs = getBackingStore(this);
                    return bs[propName];
                },
                set: function (value) {
                    var bs = getBackingStore(this);
                    if (value) {
                        bs[propName] = value.toUpperCase();
                    }
                },
                enumerable: true,
                configurable: true
            };
        }

        earlyPerson.firstName = "still early";
        ok(earlyPerson.firstName === "still early");

        var p1 = new Person("jim", "jones");

        var p1a = new Person();
        startTracking(p1);
        startTracking(p1a);
        p1a.firstName = "xxx";
        ok(p1a.firstName === "XXX");
        // used to fail on the next line 
        var p2 = new Person("bill", "smith");
        startTracking(p2);
        ok(p1.firstName === "JIM");
        ok(p2.firstName === "BILL");

        ok(p1a.firstName === "XXX");
        ok(p1.firstName === "JIM");
        ok(p2.firstName === "BILL");
    });


    test("funclet test", function () {

        var foos = [
            { id: 1, name: "Abc" },
            { id: 2, name: "def" },
            { id: 3, name: "ghi" }
        ];

        ok(foos[0] === core.arrayFirst(foos, core.propEq("name", "Abc")));
        ok(foos[2] === core.arrayFirst(foos, core.propEq("id", 3)));
    });

    test("enum test", function () {

        var proto = {
            isBright: function () { return this.toString().toLowerCase().indexOf("r") >= 0; },
            isShort: function () { return this.getName().length <= 4; }
        };

        var Color = new Enum("Color", proto);
        Color.Red = Color.addSymbol();
        Color.Blue = Color.addSymbol();
        Color.Green = Color.addSymbol();

        //    Color.RedOrBlue = Color.or(Color.Red, Color.Blue);
        //    var isB = Color.RedOrBlue.isBright();
        //    var getSymbols = Color.getSymbols();
        //    var name = Color.RedOrBlue.name();

        ok(Color.Red.isBright(), "Red should be 'bright'");
        ok(!Color.Blue.isBright(), "Blue should not be 'bright'");
        ok(!Color.Green.isShort(), "Green should not be short");

        var Shape = new Enum("Shape");
        Shape.Round = Shape.addSymbol();
        Shape.Square = Shape.addSymbol();

        ok(Shape.Round.isBright === undefined, "Shape.Round.isBright should be undefined");

        ok(Color instanceof Enum, "color should be instance of Enum");
        ok(Enum.isSymbol(Color.Red), "Red should be a symbol");
        ok(Color.contains(Color.Red), "Color should contain Red");
        ok(!Color.contains(Shape.Round), "Color should not contain Round");
        ok(Color.getSymbols().length === 3, "There should be 3 colors defined");

        ok(Color.Green.toString() == "Green", "Green.toString should be 'Green' was:" + Color.Green.toString());
        ok(Shape.Square.parentEnum === Shape, "Shape.Square's parent should be Shape");

    });
    
    test("enum test2", function () {

        var prototype = {
            nextDay: function () {
                var nextIndex = (this.dayIndex+1) % 7;
                return DayOfWeek.getSymbols()[nextIndex];
            }
        };

        var DayOfWeek = new Enum("DayOfWeek", prototype);
        DayOfWeek.Monday = DayOfWeek.addSymbol( { dayIndex: 0 });
        DayOfWeek.Tuesday = DayOfWeek.addSymbol( { dayIndex: 1 });
        DayOfWeek.Wednesday = DayOfWeek.addSymbol( { dayIndex: 2 });
        DayOfWeek.Thursday = DayOfWeek.addSymbol( { dayIndex: 3 });
        DayOfWeek.Friday = DayOfWeek.addSymbol( { dayIndex: 4 });
        DayOfWeek.Saturday = DayOfWeek.addSymbol( { dayIndex: 5, isWeekend: true });
        DayOfWeek.Sunday = DayOfWeek.addSymbol( { dayIndex: 6, isWeekend: true });
        DayOfWeek.seal();

      // custom methods
        ok(DayOfWeek.Monday.nextDay() === DayOfWeek.Tuesday);
        ok(DayOfWeek.Sunday.nextDay() === DayOfWeek.Monday);
        // custom properties
        ok(DayOfWeek.Tuesday.isWeekend === undefined);
        ok(DayOfWeek.Saturday.isWeekend == true);
        // Standard enum capabilities
        ok(DayOfWeek instanceof Enum);
        ok(Enum.isSymbol(DayOfWeek.Wednesday));
        ok(DayOfWeek.contains(DayOfWeek.Thursday));
        ok(DayOfWeek.Tuesday.parentEnum == DayOfWeek);
        ok(DayOfWeek.getSymbols().length === 7);
        ok(DayOfWeek.Friday.toString() === "Friday");
        var x = DayOfWeek.fromName("Tuesday");
        var y = DayOfWeek.fromName("xxx");

    });
    

    // return a new object that like the 'object' with ths prototype stuck in 'underneath'
    function createFromPrototype(prototype, obj) {
        var newObject = Object.create(prototype);
        for (var prop in obj) {
            if (obj.hasOwnProperty(prop)) {
                newObject[prop] = obj[prop];
            }
        }

        return newObject;
    };

})(breezeTestFns);