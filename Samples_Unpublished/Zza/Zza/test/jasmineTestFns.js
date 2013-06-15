/* TestFns with Jasmine dependencies */
(function()  {
    'use strict';

    var fns = zzaTestFns;
    fns.breezeTest = breezeTest;
    fns.failed = failed;
    fns.toFail = toFail;
    fns.addTestMatchers = addTestMatchers;
    fns.waitForTestPromises = waitForTestPromises;

    /*** ALL FUNCTION DECLARATIONS FROM HERE DOWN; NO MORE REACHABLE CODE ***/

    /*********************************************************
     * Typical breeze async test using an EntityManager that requires metadata
     * Ex: breezeTest(getLookups, done);
     *
     * where 'getLookups' created a manager, got lookups, and asserted on them
     * The 'done' parameter is jasmine's resume-test-runner callback
     *
     * If in-lined would look like this:
     *
     *   initialized.then(getLookups).fail(failed).fin(done);
     *
     *********************************************************/
    function breezeTest(testFn, done){

        return fns.initialized.then(testFn).fail(failed).fin(done);
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
