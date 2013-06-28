describe('config', function(){
    'use strict';

    it('app module should be present', function () {
        expect(angular.module('app')).toBeDefined();
    });

    beforeEach(module('app'));
    
    it('should return a non-empty serviceName',
        inject(function (config) {
            expect(config.serviceName).toBeTruthy();
        }));
});


