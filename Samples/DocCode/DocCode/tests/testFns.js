/*********************************************************
 * testFns reduces boilerplate repetition in tests
 *********************************************************/
// ReSharper disable InconsistentNaming

define(["breeze"], function (breeze) {

    "use strict";

    extendString();

    /*********************************************************
    * testFns - the module object
    *********************************************************/
    var testFns = {
        breeze: breeze,
        northwindServiceName: "api/Northwind",
        todosServiceName: "api/todos",

        handleFail: handleFail,
        getModuleOptions: getModuleOptions,
        teardown_todosReset: teardown_todosReset,
        output: output,
        stopCount: stopCountFactory(),

        newEmFactory: newEmFactory,
        populateMetadataStore: populateMetadataStore,

        verifyQuery: verifyQuery,
        queryForSome: queryForSome,
        queryForOne: queryForOne,
        queryForNone: queryForNone,
        runQuery: runQuery,
        ensureIsEm: ensureIsEm,

        getNextIntId: getNextIntId,
        getNewGuidId: getNewGuidId,
        
        assertIsSorted: assertIsSorted,
        getValidationErrMsgs: getValidationErrMsgs,
        morphString: morphString,
        morphStringProp: morphStringProp,

        todosPurge: todosPurge, // empty the database completely
        todosReset: todosReset, // reset to known state

        // Asserts merely to display data
        showCustomerResultsAsAssert: showCustomerResultsAsAssert,

        wellKnownData: {
            // ID of the Northwind "Alfreds Futterkiste" customer
            alfredsID: '785efa04-cbf2-4dd7-a7de-083ee17b6ad2',
            // ID of the Northwind "Nancy Davolio" employee
            nancyID: 1,
            // Key values of a Northwind "Alfreds Futterkiste"'s OrderDetail
            alfredsOrderDetailKey: { OrderID: 10643, ProductID: 28 /*Rössle Sauerkraut*/ },
            // ID of Chai product
            chaiProductID: 1
        }
    };
    var _nextIntId = 10000; // seed for getNextIntId()
    return testFns;

    /*** ALL FUNCTION DECLARATIONS FROM HERE DOWN; NO MORE REACHABLE CODE ***/

    /*******************************************************
    * String extensions
    *Monkey punching JavaScript native String class
    * w/ format, startsWith, endsWith
    * go ahead and shoot me but it's convenient 
    ********************************************************/
    function extendString() {
        var stringFn = String.prototype;

        stringFn.format = stringFn.format || function () {
            var s = this;
            for (var i = 0, len = arguments.length; i < len; i++) {
                var reg = new RegExp("\\{" + i + "\\}", "gm");
                s = s.replace(reg, arguments[i]);
            }

            return s;
        };

        stringFn.endsWith = stringFn.endsWith || function (suffix) {
            return (this.substr(this.length - suffix.length) === suffix);
        };

        stringFn.startsWith = stringFn.startsWith || function (prefix) {
            return (this.substr(0, prefix.length) === prefix);
        };

        stringFn.contains = stringFn.contains || function (value) {
            return (this.indexOf(value) !== -1);
        };
    }

    /*********************************************************
    * Callback for test failures.
    *********************************************************/
    // Usage:  .fail(handleFail)
    function handleFail(error) {
        if (error.handled === true) return;
        //ok(false, "failed");
        if (error.message) {
            ok(false, error.message);
        } else {
            ok(false, "Failed: " + error.toString());
        }
        start();
    }

    /*********************************************************
    * Factory of EntityManager factories (newEm functions)
    *********************************************************/
    // Creates newEm(), a typical function for making new EntityManagers (an "EM factory) 
    // usage: 
    //    var serviceName = testFns.northwindServiceName,
    //        newEm = testFns.emFactory(serviceName);
    //    ...
    //    var em = newEm();
    function newEmFactory(serviceName) {
        var factory = function () {
            return new breeze.EntityManager(factory.options);
        };
        factory.options = {
            serviceName: serviceName,
            // every module gets its own metadataStore; they do not share the default
            metadataStore: new breeze.MetadataStore()
        };
        return factory;
    }

    /*********************************************************
    * getModuleOption -Get the options to pass to the QUnit module call
    *********************************************************/
    // Typical test module initialization: 
    //    var serviceName = testFns.northwindServiceName;
    //    var newEm = testFns.emFactory(serviceName, metadataStore);
    //    module("testModuleName", testFns.getModuleOptions(newEm);
    //
    // See populateMetadataStore for info about optional metadataSetuFn
    function getModuleOptions(newEm, metadataSetupFn) {
        return {
            setup: function () { populateMetadataStore(newEm, metadataSetupFn); },
            teardown: function () { }
        };
    }

    /*********************************************************
    * Populate an EntityManager factory's metadataStore
    *********************************************************/
    // Keep a single copy of the metadataStore in this module
    // and reuse it with each new EntityManager
    // so we don't make repeated requests for metadata 
    // every time we create a new EntityManager
    function populateMetadataStore(newEm, metadataSetupFn) {

        var metadataStore = newEm.options.metadataStore;

        // Check if the module metadataStore is empty
        if (!metadataStore.isEmpty()) {
            return; // ok ... it's been populated ... we're done.
        }

        // It's empty; get metadata
        var serviceName = newEm.options.serviceName;
        stop(); // tell testrunner to wait.

        metadataStore.fetchMetadata(serviceName)
        .then(function () {
            if (typeof metadataSetupFn === "function") {
                metadataSetupFn(metadataStore);
            }
        })
        .fail(handleFail)
        .fin(start); // resume testrunner
    }

    /*********************************************************
    * Teardown for a module that saves to the Todos database
    *********************************************************/
    // should call this during test teardown to restore
    // the database to a known, populated state.
    function teardown_todosReset() {
        stop();
        todosReset().fail(handleFail).fin(start).done();
    }

    /*********************************************************
    * Get or Create an EntityManager
    *********************************************************/
    // get an EntityManager from arg (which is either an em or an em factory)
    function ensureIsEm(em) {
        if (!(em instanceof breeze.EntityManager)) {
            return em(); // assume it's an EntityManager factory, e.g. "newEm".
        }
        return em;
    }
    /*********************************************************
    * Generate the next new integer Id
    *********************************************************/
    function getNextIntId() {
        return _nextIntId++;
    }
    /*********************************************************
    * Generate the next new integer Id
    *********************************************************/
    function getNewGuidId() {
        return breeze.core.getUuid();
    }
    /*********************************************************
    * Verify query and its results
    *********************************************************/
    // Verifies that query returned some items; can extend with more asserts.
    // Stops the testrunner with "stop()" and executes the query with 
    // an EntityManager (or EntityManager factory);
    // NB: this fn calls both stop() and start(); you cannot chain it.
    // 
    // Can add additional synchronous assert functions to the
    // function arguments; put them after 'queryName".
    // Each will be called with the initial query result, 
    // augmented with "queryName", "query", and "first" item
    //
    // Handles server or assertion failure.
    function verifyQuery(em, query, queryName) {

        // args after 'queryName' are more asserts
        var asserts = [].slice.call(arguments, 3);

        stop(); // going async; tell testrunner to wait

        queryForSome(em, query, queryName)

         .then(function (data) {
             asserts.forEach(function (fn) {
                 fn(data);
             });
         })

        .fail(handleFail)
        .fin(start); // testrunner resumes
    }

    /*********************************************************
    * Promise to get some query results
    *********************************************************/
    // Returns a promise that the query returns some items
    // The query "data" is augmented with "queryName", "query", and "first" result
    // NB: does NOT call stop() or start(); some caller must handle async
    //     calls one assert; add 1 to your assert count expectation
    function queryForSome(em, query, queryName) {
        return runQuery(em, query, queryName, null);
    }

    /*********************************************************
    * Promise to get one result from a query
    *********************************************************/
    // Returns a promise that the query gets one item.
    // The query "data" is augmented with "queryName", "query", and "first" result
    // NB: does NOT call stop() or start(); some caller must handle async
    //     calls one assert; add 1 to your assert count expectation
    function queryForOne(em, query, queryName) {
        queryName = queryName || "get first";
        return runQuery(em, query, queryName, 1);
    }
    /*********************************************************
    * Promise to get ZERO results from a query
    *********************************************************/
    // Returns a promise that the query returns NO results.
    // The query "data" is augmented with "queryName", "query", and "first" result (null)
    // NB: does NOT call stop() or start(); some caller must handle async
    //     calls one assert; add 1 to your assert count expectation
    function queryForNone(em, query, queryName) {
        return runQuery(em, query, queryName, 0);
    }
    /*********************************************************
    * Promise to get some query results
    *********************************************************/
    // Returns a promise that the query returned items that "meet expectations"
    // The "expected" param determines if the items returned match expectation.
    //     if not defined, expect more than zero items.
    //     if a number, expect that many results.
    //     if a function, apply it to the results.
    // The query result is augmented with "queryName", "query", and "first" item
    // NB: does NOT call stop() or start(); some caller must handle async
    //     calls one assert; add 1 to your assert count expectation
    function runQuery(em, query, queryName, expected) {
        em = ensureIsEm(em);

        queryName = (!queryName) ? "query" : "\"" + queryName + "\" ";

        if (typeof expected === "number") {
            var expectedCount = expected;
            expected = function (results) { return results.length === expectedCount; };
        } else if (typeof expected !== "function") {
            expected = function (results) { return results.length > 0; };
        }

        // about to go async!
        query = query.using(em); // adds EntityManager to the query

        return query.execute()
            .then(function (data) {
                var results = data.results, count = results.length;
                ok(expected(results),
                    "{0} returned {1} item(s)".format(queryName, count));
                data.query = query;
                data.queryName = queryName;
                data.first = count ? data.results[0] : null;
                return Q.fcall(function () { return data; });
            });
    }

    /**************************************************
    * Pure Web API calls aimed at the TodosController
    * issued with jQuery and wrapped in q.js promise
    **************************************************/
    function todosPurge() {

        var deferred = Q.defer();

        $.post(testFns.todosServiceName + '/purge',
            function (data, textStatus, jqXHR) {
                deferred.resolve(
                    "Purge svc returned '" + jqXHR.status + "' with message: " + data);
            })
        .error(function (jqXHR, textStatus, errorThrown) { deferred.reject(errorThrown); });

        return deferred.promise;
    }

    function todosReset() {

        var deferred = Q.defer();

        $.post(testFns.todosServiceName + '/reset',
            function (data, textStatus, jqXHR) {
                deferred.resolve(
                   "Reset svc returned '" + jqXHR.status + "' with message: " + data);
            })
        .error(function (jqXHR, textStatus, errorThrown) { deferred.reject(errorThrown); });

        return deferred.promise;
    }
    /*********************************************************
    * Return an entity's validation error messages as a string
    *********************************************************/
    function getValidationErrMsgs(entity) {
        var errs = entity.entityAspect.getValidationErrors();
        return errs.length ?
            errs.map(function (err) { return err.errorMessage; }).join(", ") :
            "no errors";
    }
    /*********************************************************
    * Result display fns
    *********************************************************/
    function showCustomerResultsAsAssert(data, limit) {
        var results = customerResultsToStringArray(data, limit || 10);
        QUnit.ok(true, (results.length) ? "[" + results.join("], [") + "]" : "[none]");
    }

    //    function customerResultsToHtml(data, limit) {
    //        var results = customerResultsToStringArray(data, limit).join("</li><li>");
    //        return (results.length) ? "<ol><li>" + results + "</li></ol>" : "[none]";
    //    }

    function customerResultsToStringArray(data, limit) {
        var count = data.results.length;
        var results = (limit) ? data.results.slice(0, limit) : data.results;
        var out = results.map(function (c) {
            return "({0}) {1} in {2}, {3}".format(
                c.CustomerID_OLD(), c.CompanyName(), c.City(), (c.Region() || "null"));
        });
        if (count > out.length) { out.push("..."); }
        return out;
    }

    /*********************************************************
    * assert that the collection of entities is sorted properly on one property
    *********************************************************/
    function assertIsSorted(collection, propertyName, isDescending, isCaseSensitive) {
        isCaseSensitive = isCaseSensitive == null ? true : isCaseSensitive;
        var fn = function (a, b) {
            // localeCompare has issues in Chrome.
            // var compareResult = a[propertyName].localeCompare(b.propertyName);
            var av = a.getProperty(propertyName);
            var bv = b.getProperty(propertyName);
            if (typeof av === "string" && !isCaseSensitive) {
                av = av.toLowerCase();
                bv = (bv || "").toLowerCase();
            }
            var compareResult = av < bv ? -1 : (av > bv ? 1 : 0);
            return isDescending ? compareResult * -1 : compareResult;
        };
        var arrayCopy = collection.map(function (o) { return o; });
        arrayCopy.sort(fn);
        ok(breeze.core.arrayEquals(collection, arrayCopy), propertyName + "not sorted correctly");
    }

    /*********************************************************
    * Other helpers borrowed from breeze test code
    *********************************************************/
    function morphStringProp(entity, propName) {
        var val = entity.getProperty(propName);
        var newVal = morphString(val);
        entity.setProperty(propName, newVal);
        return newVal;
    }

    function morphString(str) {
        if (!str) {
            return "_X";
        }
        if (str.length > 1 && breeze.core.stringEndsWith(str, "_X")) {
            return str.substr(0, str.length - 2);
        } else {
            return str + "_X";
        }
    }

    function output(text) {
        document.body.appendChild(document.createElement('pre')).innerHTML = text;
    }

    // Makes an instance of "stopCount"
    // calls "QUnit.stop()" and counts how many times it did so.
    // calling "start()" issues as many "QUnit.start()" calls
    // as needed to clear the stops.
    // Usage:
    //    call stopCount() where you would otherwise call stop()
    //    call stopCount(x) when you want to call stop() AND set the counter.
    //    call stopCount.start()  when you want to call start() 
    //         as many times as the inner count.
    function stopCountFactory() {

        var stopCount = function (count) {
            if (count) { this.count = count; }
            stop();
        };

        stopCount.prototype.start = function () {
            this.count--;
            if (!this.count) {
                start();
                return true;
            } else {
                return false;
            }
        };

        stopCount.prototype.handleFail = handleFail;

        return stopCount;
    }

});

