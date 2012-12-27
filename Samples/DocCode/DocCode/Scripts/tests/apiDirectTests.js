/**********************************************
 * Prototype for the typical test modules
 **********************************************/

// ReSharper disable UnusedParameter
/***********************************************************
* Api Direct Test Module
*
* Call the persistence service with jQuery
* instead of Breeze EntityManager
***********************************************************/
// ReSharper disable InconsistentNaming

define(["testFns"], function (testFns) {

    "use strict";

    module("api direct tests",
        { teardown: testFns.teardown_todosReset });

    /*********************************************************
    * purge the Todos Db
    *********************************************************/

    test("purge the Todos Db", 1, function () {

        stop();
        testFns.todosPurge()
            .then(function (msg) {
                ok(0 < msg.indexOf("purge"), msg);
            })
            .fail(testFns.handleFail)
            .fin(start);
    });
    
   

    /*********************************************************
    * reset the Todos Db
    *********************************************************/

    test("reset the Todos Db", 1, function () {

        stop();
        testFns.todosReset()
            .then(function (msg) {
                ok(0 < msg.indexOf("reset"), msg);
            })
            .fail(testFns.handleFail)
            .fin(start);
    });

});