/* TestFns with Jasmine dependencies */
(function()  {
    'use strict';

    var _isInitialized;
    extendAsyncSpec();
    addCustomMatchers();

    var fns = zzaTestFns;
    fns.breezeTest = breezeTest;
    fns.initialize = initialize;
    fns.failed = failed;
    fns.toFail = toFail;
    fns.waitForTestPromises = waitForTestPromises;
    fns.xasync = {it: xit, xit: xit};

    /*** TEST the JasmineTestFns ***/
    /*********************************************************
     * Run these tests of jasmineTestFns when suspect something broke
     * To run, remove the 'x' in front of describe
     * To disable, prefix describe with 'x'
     *********************************************************/
    xdescribe("jasmineTestFns", function(){

        describe('when do not involve Q', function() {

            var async = new AsyncSpec(this);
            var xasync = fns.xasync;

            it("'it' still works",function(){
                console.log("'xit' is " + xit) ;
            });

            it("'xit' still works",function(){});

            async.it("should finish immediately", function (done){
                done();
            });

        });

        describe('when involving Q', function() {

            /* IF THESE ARE DRAMATICALLY SLOW, RESTART THE KARMA NODE SERVICE */
            var async = new AsyncSpec(this);
            var testCounter =0;
            for (var i=0; i < 8; i++){
                async.it("should be fast", function (done){
                    //console.log("no-Q Test "+ testCounter++);
                    //done();
                    console.log("Q Test "+ testCounter++) ;
                    Q(true).done(done) ;
                });
            }

            async.it("Q.delay(10) should finish immediately after initialization", function (done){
                Q.delay(10).then(testFn).fail(failed).fin(postTest).done();//.fin(done);
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
    });

    /*** ALL FUNCTION DECLARATIONS FROM HERE DOWN; NO MORE REACHABLE CODE ***/
    /*********************************************************
     * Zza test initialization
     *********************************************************/
    function initialize (done){
        try {
            if (_isInitialized) {
                //console.log("**already initialized**");
                return Q(true);
            }
            return fns.fetchMetadata().then(function(){ _isInitialized = true;});
        } catch(e){
            done();
            console.log("**crashed in initialize**");
            _isInitialized = false;
            expect().toFail("initialize failed: "+e) ;
        }
    }

    /*********************************************************
     * Extend AsyncSpec with ability to disable its 'it'
     *********************************************************/
    function extendAsyncSpec(){
        var fn = AsyncSpec.prototype;
        if (!fn.xit) {fn.xit = xit}
    }

    /*********************************************************
     * Add our custom Jasmine test matcher
     * Like custom asserts.
     * Todo: accept a hash arg to blend with ours
     *********************************************************/
    function addCustomMatchers() {
        beforeEach( function(){
            this.addMatchers({
                toFail: toFail,
                toRegExMatch: toRegExMatch
            });
        })
    }

    /*********************************************************
     * Typical breeze async test using an EntityManager that requires metadata
     * Ex: breezeTest(lookupsQuery, done);
     *
     * where 'lookupsQuery' created a manager, got lookups, and asserted on them
     * The 'done' parameter is jasmine's resume-test-runner callback
     *
     * If in-lined would look like this:
     *
     *   initialize(done).then(lookupsQuery).fail(failed).fin(done);
     *
     *********************************************************/
    function breezeTest(testFn, done){
        return fns.initialize(done).then(testFn).fail(failed).fin(done);
    }

    /*********************************************************
     * All purpose failure reporter to be used within Q.fail()
     *********************************************************/
    function failed(err) {
        console.log('** unexpected failure: '+err.message);
        expect().toFail(err.message);
        console.log('** re-throwing error');
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
     * Jasmine RegExp matcher
     * Ex: expect(error.message).toRegExMatch(/not authorized to save/i);
     *********************************************************/
    function toRegExMatch(regex, template) {
        var actual = this.actual;
        var notText = this.isNot ? "not " : "";
        template = template || 'expected "{0}" to {1}match "{2}"';
        this.message = function(){
            return template.format(actual, notText, regex);
        }
        return regex.test(actual);
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
