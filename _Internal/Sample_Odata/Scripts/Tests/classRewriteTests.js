require.config({ baseUrl: "Scripts/IBlade" });

define(["testFns"], function (testFns) {
    var root = testFns.root;
    var core = root.core;
    var entityModel = root.entityModel;

    var EntityAspect = entityModel.EntityAspect;

    var MetadataStore = entityModel.MetadataStore;
    module("classRewrite", {
        setup: function () {
            this.interceptor = function (propName, newValue, accessorFn) {
                var prevValues = this.prevValues;
                if (!prevValues) {
                    prevValues = [];
                    this.prevValues = prevValues;
                }
                var oldValue = accessorFn();
                if (oldValue != null) {
                    prevValues.push(oldValue);
                }
                accessorFn(newValue);
            };

        },
        teardown: function () {

        }
    });

    function nottest() {

    }

    test("class watcher - inherited", function () {

        var metadataStore = new MetadataStore();
        var Entity = function () {

        };

        var Person = function (firstName, lastName) {
            this.firstName = firstName;
            this.lastName = lastName;
        };
        Person.prototype = new Entity;

        metadataStore.trackUnmappedType(Person, this.interceptor);

        var per1 = new Person("Jane", "Doe");
        var per2 = new Person("a", "b");

        var Employee = function (firstName, lastName, job) {
            Person.call(this, firstName, lastName);
            this.job = job;
        };
        Employee.prototype = new Person;

        metadataStore.trackUnmappedType(Employee, this.interceptor);

        var emp1 = new Employee("John", "Smith", "CTO");
        var aspect = new EntityAspect(emp1);
        var emp2 = new Employee("Fred", "Jones", "Eng");
        new EntityAspect(emp2)
        emp2.setProperty("firstName", "Bill");
        ok(emp2.getProperty("firstName") === "Bill", "firstName should be Bill");
        ok(emp2.getProperty("lastName") === "Jones", "lastName should be Jones");
        ok(emp2.prevValues.length === 1, "prevValues should have length of 1");

        equal(emp1.getProperty("firstName"), "John", "first name should be John");
        equal(emp1.getProperty("lastName"), "Smith", "lastName should be Smith");
        equal(emp1.getProperty("job"), "CTO", "job should be CTO");

        emp1.setProperty("firstName", "John L.");
        emp1.setProperty("lastName", "Smythe");
        ok(emp1.getProperty("firstName") === "John L.", "firstName should be 'John L'");
        ok(emp1.getProperty("lastName") === "Smythe", "lastName should be Smythe");

        ok(emp1.prevValues.length === 2);
        // next line is needed for chrome.
        new EntityAspect(per1);
        per1.setProperty("firstName", "Jen");
        ok(per1.getProperty("firstName") === "Jen");
        ok(per1.prevValues.length === 1, "getPrevValues() length should be 1");

    });

    test("class watcher - 2", function () {

        var Customer = function () {
            this.companyName = null;
        };

        var metadataStore = new MetadataStore();
        metadataStore.trackUnmappedType(Customer, this.interceptor);

        var cust1 = new Customer();
        // next line is needed by chrome.
        new EntityAspect(cust1);
        cust1.setProperty("companyName", "foo");
        cust1.setProperty("companyName", "bar");
        ok(cust1.getProperty("companyName") === "bar");
        ok(cust1.prevValues.length === 1);


    });

    test("class watcher - 3", function () {

        var Customer = function () {
            this.companyName = null;
        };

        var metadataStore = new MetadataStore();
        metadataStore.trackUnmappedType(Customer, this.interceptor);

        var cust1 = new Customer();
        // next line is needed by Chrome.
        new EntityAspect(cust1);
        cust1.setProperty("companyName", "foo");
        cust1.setProperty("companyName", "foox");
        ok(cust1.prevValues.length === 1);
        var oldInterceptor = Customer.prototype.interceptor;
        Customer.prototype.interceptor = function (p, v, a) { a(v); };
        cust1.setProperty("companyName", "bar");
        ok(cust1.getProperty("companyName") === "bar");
        ok(cust1.prevValues.length === 1);
        Customer.prototype.interceptor = oldInterceptor;
        cust1.setProperty("companyName", "foo2");
        ok(cust1.getProperty("companyName") == "foo2");
        ok(cust1.prevValues.length === 2);

    });

    return testFns;

});