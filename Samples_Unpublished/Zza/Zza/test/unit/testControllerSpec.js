(function()  {
    'use strict';
    xdescribe('TestController', function(){

        it('should succeed', function () {
            console.log('TestController test1');
            expect(2).toBe(2);
        });

        it('breeze should be present', function () {
            expect(breeze).toBeDefined();
        });

        it('app module should be present', function () {
            expect(angular.module('app')).toBeDefined();
        });
    });

})();

