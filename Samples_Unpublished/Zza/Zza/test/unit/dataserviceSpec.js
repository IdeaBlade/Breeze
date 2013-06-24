describe('dataservice', function () {
    'use strict';
    var fakeLogger;
    
    beforeEach(module('app'));
    
    beforeEach(function () {
        fakeLogger = sinon.stub() ;
        

        module(function ($provide) {
            // replace the application 'logger' with the fake.
            $provide.value('logger', fakeLogger);
            
            var manager = zzaTestFns.newTestManager();
            // Todo: don't stringify after EntityManager.importEntities() accepts JSON
            var lookups = JSON.stringify(zza.lookups);
            manager.importEntities(lookups);
            zzaTestFns.setManagerToFetchFromCache(manager);
            $provide.value('entityManagerProvider', { manager: manager });
        });

    });

    it('should obtain a dataservice',
        inject(function (dataservice) {
            expect(dataservice).toBeTruthy();
        }));
});