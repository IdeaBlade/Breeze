// ReSharper disable InconsistentNaming
/*********************************************************
* Extends jasmine.async.js's `AsyncSpec` with promise-oriented flavors.
*
* v.1.0.0
*
* Load after jasmine.async.js which provides mocha-like async spec syntax
*    IdeaBlade fork (required): https://github.com/IdeaBlade/jasmine.async.git
*    Original: http://github.com/derickbailey/jasmine.async
*
* Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.  
* Licensed under the MIT License
* http://opensource.org/licenses/mit-license.php

* Author: Ward Bell
*********************************************************/
(function () {
    'use strict';
    extendAsyncSpec();

    /*********************************************************
    * Extend jasmine.async.js's `AsyncSpec` with promise-oriented flavors;
    * Also adds the disabled versions of `it`: `xit` and `xpit`
    *
    * pit - promise-oriented async `it`
    * promiseAfterEach - promise-oriented async `afterEach`
    * promiseBeforeEach - promise-oriented async `beforeEach`
    * ------------------------------------------------------
    * These flavors of the jasmine.async `afterEach`, `beforeEach`, and `it` 
    * run an async spec function that return a promise. 
    * That spec function typically takes real time and can't be mocked.
    *
    * Use this helper when the test involves an async process 
    * (ex: a real AJAX call or a Breeze EntityManager method) 
    * that we can't control via angular/jasmine mocks.
    * The async process or processes rely on $q promises.
    *
    * Because we don't know when these processes will respond
    * this harness periodically calls $digest to simulate the angular event loop
    * that will ultimately flush the $q buffer when 
    * the invoked async method(s) finally respond.
    * 
    * Ex: async.pit("can get lookups", function () {
    *       // The $q-promise-returning test that
    *       // creates a Breeze EntityManager, gets metadata, queries lookups, 
    *       // and asserts on the results in its success callback.
    *     });
    *
    * Ex: async.pit("can get lookups", function () {...),
    *             timeoutMessage, timeoutInMs);
    *
    * The `this` within each function block is the spec context object
    * ------------------------------------------------------
    * N.B. The scope of an AsyncSpec instance begins in the scope where it is defined.
    * If you want to start a new, inner scope (e.g., with a new describe block
    * you must create a new AsyncSpec instance or do something crazy `this` patchwork like
    *
    *     // are you kidding me?
    *     async.promiseBeforeEach.call({spec: this}, function () {...});
    *
    *********************************************************/
    function extendAsyncSpec() {
        var fn = AsyncSpec.prototype;
        if (!fn.promiseAfterEach) { fn.promiseAfterEach = promiseAfterEach; }
        if (!fn.promiseBeforeEach) { fn.promiseBeforeEach = promiseBeforeEach; }
        if (!fn.pit) { fn.pit = pit; }
        if (!fn.xpit) { fn.xpit = xit; }
        if (!fn.xit) { fn.xit = xit; }

        /*
         * Execute a promise-returning asynchronous spec (AKA test).
         * @param {String} description description of the spec
         * @param {Function} block Spec function. Takes a single parameter, the "done" function
         * @param {String} optionalTimeoutMessage to display if the spec times out
         * @param {Number} optionalTimeout in milliseconds
         */
        function pit(description, block, optionalTimeoutMessage, optionalTimeout) {
            fn.it.call(this, description, wrap(block), optionalTimeoutMessage, optionalTimeout);
        };
        /*
         * Execute a promise-returning asynchronous function that runs before each spec.
         * @param {Function} block that takes a single parameter, the "done" function
         * @param {String} optionalTimeoutMessage to display if the block times out
         * @param {Number} optionalTimeout in milliseconds
         */
        function promiseBeforeEach (block, optionalTimeoutMessage, optionalTimeout) {
            fn.beforeEach.call(this, wrap(block), optionalTimeoutMessage, optionalTimeout);
        };

        /*
         * Execute a promise-returning asynchronous function that runs after each spec.
         * @param {Function} block that takes a single parameter, the "done" function
         * @param {String} optionalTimeoutMessage to display if the block times out
         * @param {Number} optionalTimeout in milliseconds
         */
        function promiseAfterEach(block, optionalTimeoutMessage, optionalTimeout) {
            fn.afterEach.call(this, wrap(block), optionalTimeoutMessage, optionalTimeout);
        };

        // The `pit` magic is in wrap which returns a function 
        // that wraps the testFn (block) and handles the event looping
        // The wrapped function takes the `done` method supplied by
        // jasmine-async's `async.it` which it calls when the testFn resolves,
        // thereby telling the test harness that the test is done and
        // it can move on to the next spec.
        function wrap(block) {
            // `done` fn is the jasmine-async callback that signals the async 
            // process has completed and the test harness should resume.
            return function (done) {
                var self = this;
                // repeat Angular event loop until tests are finished
                var intervalId = digestForever(done);

                try {
                    block.call(self, done)
                        .catch(failed)
                        .finally(function () {
                            // tests are finished: end event loop and signal done
                            clearInterval(intervalId);
                            done();
                        });
                } catch (e) {
                    var prefix = "spec function failed before returning or does not return a promise. ";
                    failed(new Error(prefix + (e.message || e)));
                    clearInterval(intervalId);
                    done();
                }
            };
        }
        /*********************************************************
        * Run $digest continuously using a real interval timer
        * returns handle to that timer
        * caller must clear that interval timer
        * If $digest throws exception, 
        *     stops the timer, fails the test, and calls done
        *********************************************************/
        function digestForever(done) {
            var $rootScope;
            inject(function (_$rootScope_) { $rootScope = _$rootScope_; });
            var intervalId = setInterval(
                function () {
                    try {
                        if (!$rootScope.$$phase) {
                            $rootScope.$digest();
                        }
                    } catch (e) {
                        clearInterval(intervalId);
                        failed(e);
                        if (done) { done(); }
                    }
                }, 10);
            return intervalId;
        }
        /*********************************************************
         * All purpose failure reporter to be used within promise fails
         *********************************************************/
        function failed(err) {
            var msg = 'Unexpected async promise spec failure: ' + (err.message || err);
            if (err.body) {
                msg += err.body.Message + " " + err.body.MessageDetail;
            } else if (err.statusText) {
                msg += err.statusText;
            }
            console.log(msg);
            expect().toFail(msg);
        }
    }
})();
