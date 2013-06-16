/* Zza/Breeze Web API save */
describe('Zza/Breeze web api', function(){
    'use strict';
    var testFns = zzaTestFns;
    var breezeTest = testFns.breezeTest;
    var newEm = testFns.newEm;
    var EntityQuery = breeze.EntityQuery;

    var async = new AsyncSpec(this);
    var xasync = testFns.xasync;

    describe('when unauthorized to save type', function() {

         async.it("should not save new Product", function (done){

            breezeTest(test, done);

            function test(){
                var em = newEm();
                var product = em.createEntity('Product', {
                    type: 'pizza',
                    name: 'The Gordo',
                    description: 'Too much pizza for anyone',
                    hasOptions: true
                })

                return em.saveChanges().then(success).fail(fail);
            }
            function success(data){
                //console.log('** new product was saved?!');
                expect().toFail('save of new product should not have succeeded');
            }
            function fail(error){
                var emsg = error.message;
                var re = /not authorized to save/i;
                //console.log('save of new product failed (as it should) with error: "' + emsg + '"');
                expect(emsg).toRegExMatch(re);
            }
        });
    });

});
