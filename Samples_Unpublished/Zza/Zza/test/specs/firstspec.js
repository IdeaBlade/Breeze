xdescribe("first spec", function() {
    'use strict';
    it('should fail', function() {
        console.log('first');
        var myObj = { method: function (){return 4; } };
        expect(myObj.method()).toBe(1);
    });

    it('should succeed', function () {
        console.log('howdy');
        expect(2).toBe(2);
    });

});