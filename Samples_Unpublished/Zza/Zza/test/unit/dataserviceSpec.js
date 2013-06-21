describe('dataservice', function () {
    'use strict';
    var fakeLogger;
    
    beforeEach(module('app'));
    
    beforeEach(function () {
        fakeLogger = sinon.stub();
        
        // replace the application 'logger' with the fake.
        module(function($provide) {
            $provide.value('logger', fakeLogger);
        });
    });

    it('should obtain a dataservice',
        inject(function (dataservice) {
            expect(dataservice).toBeTruthy();
        }));
});