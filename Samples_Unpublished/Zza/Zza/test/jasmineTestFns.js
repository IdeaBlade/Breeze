/* TestFns with Jasmine dependencies */
(function()  {
    'use strict';

    extendAsyncSpec();

    var fns = zzaTestFns;
    fns.breezeTest = breezeTest;
    fns.failed = failed;
    fns.toFail = toFail;
    fns.addTestMatchers = addTestMatchers;
    fns.waitForTestPromises = waitForTestPromises;
    fns.xasync = {it: xit, xit: xit};

    /*** TEST the JasmineTestFns ***/
    /*********************************************************
     * Run these tests of jasmineTestFns when suspect something broke
     * To run, remove the 'x' in front of describe
     * To disable, prefix describe with 'x'
     *********************************************************/
    xdescribe('jasmineTestFns tests', function() {

        var async = new AsyncSpec(this);
        var xasync = fns.xasync;
        fns.addTestMatchers();

        it("'it' still works",function(){
            console.log("'xit' is " + xit) ;
        });

        it("'xit' still works",function(){});

        async.it("should finish immediately", function (done){
            done();
        });

        async.it("Q.delay(10) should finish immediately after initialization", function (done){
            Q.delay(10).then(testFn).fail(failed).fin(postTest);//.fin(done);
            function testFn(){return true;}
            function postTest(){
                done();
                console.log("Q.delay PostTest") ;
                return true;
            }
        });

        async.it("should finish immediately after initialization", function (done){
            fns.initialize(done).then(testFn).fail(failed).fin(postTest);//.fin(done);
            function testFn(){return true;}
            function postTest(){
                done();
                console.log("PostTest 1") ;
                return true;
            }
        });

        async.it("should finish immediately after initialization 2ND TIME", function (done){
            fns.initialize(done).then(testFn).fail(failed).fin(postTest);//.fin(done);
            function testFn(){return true;}
            function postTest(){
                done();
                console.log("PostTest 2") ;
                return true;
            }
        });
    });

    /*** ALL FUNCTION DECLARATIONS FROM HERE DOWN; NO MORE REACHABLE CODE ***/

    /*********************************************************
     * Extend AsyncSpec with ability to disable its 'it'
     *********************************************************/
    function extendAsyncSpec(){
        var fn = AsyncSpec.prototype;
        if (!fn.xit) {fn.xit = xit}
    }
    /*********************************************************
     * Typical breeze async test using an EntityManager that requires metadata
     * Ex: breezeTest(ookupsQuery, done);
     *
     * where 'getLookups' created a manager, got lookups, and asserted on them
     * The 'done' parameter is jasmine's resume-test-runner callback
     *
     * If in-lined would look like this:
     *
     *   initialize(done).then(ookupsQuery).fail(failed).fin(done);
     *
     *********************************************************/
    function breezeTest(testFn, done){

        return fns.initialize(done).then(testFn).fail(failed).fin(function(){
            console.log("entered done for "+testFn.name);
            done();
        });
    }
    /*********************************************************
     * All purpose failure reporter to be used within Q.fail()
     *********************************************************/
    function failed(err) {
        expect().toFail(err.message);
        throw err;
    }
    /*********************************************************
     * Jasmine matcher that always fails with the message
     * Ex: expected().toFail('what a mess');
     *********************************************************/
    function toFail(message) {  // matcher
        this.message = function(){return message;};
        return false;
    }
    /*********************************************************
     * Add our custom Jasmine test matcher
     * Like custom asserts.
     * Todo: accept a hash arg to blend with ours
     *********************************************************/
    function addTestMatchers() {
        beforeEach( function(){
            this.addMatchers({toFail: toFail });
        })
    }
    /*********************************************************
     * Wait for an array of test promises to finish.
     * TODO: ReportRejectedPromises needs a custom matcher for the message
     *********************************************************/
    function waitForTestPromises(promises) {
        Q.allResolved(promises).then(reportRejectedPromises).fin(start);
    }
    function reportRejectedPromises(promises) {
        for (var i = 0, len = promises.length; i < len; i++) {
            var promise = promises[i];
            if (promise.isRejected()) {
                var msg = "Operation #{0} failed. ";
                var ex = promise.valueOf().exception;
                msg += ex ? ex.message : " Not sure why.";
                expect().toFail( msg.format(i + 1));
            }
        }
    }

})();
