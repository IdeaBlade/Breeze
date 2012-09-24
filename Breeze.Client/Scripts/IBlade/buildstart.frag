/*
 * Copyright 2012 IdeaBlade, Inc.  All Rights Reserved.  
 * Use, reproduction, distribution, and modification of this code is subject to the terms and 
 * conditions of the IdeaBlade Breeze license, available at http://www.breezejs.com/license
 *
 * Author: Jay Traband
 */
(function (window, definitionFn) {
    if ( typeof define === "function") {
        if (define.amd && define.amd.breeze ) {
            define( "breeze", [], definitionFn );
        } else {
            define([], definitionFn);
        }
    } else {
        definitionFn();
    }
    
}(window, function () {
