xdescribe("first spec", function() {

    it('should ~fail', function() {
        console.log('first');
        var myObj = { method: function (){return 4; } };
        expect(myObj.method()).toBe(4);
    });

    it('should succeed', function () {
        console.log('howdy');
        expect(2).toBe(2);
    });

});