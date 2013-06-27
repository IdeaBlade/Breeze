describe('util', function () {
    'use strict';
    var u; // util

    it('app module should be present', function () {
        expect(angular.module('app')).toBeDefined();
    });

    beforeEach(module('app'));

    beforeEach(inject(function (util) {
        u = util;
    }));

    it('should be created', function () {
        expect(u).toBeTruthy();
    });

    it('should have function members', function () {
        expect(u.filterById).toBeTruthy();
        expect(u.filterByName).toBeTruthy();
        expect(u.filterByType).toBeTruthy();
        expect(u.getSaveErrorMessages).toBeTruthy();
        expect(u.getEntityValidationErrMsgs).toBeTruthy();
        expect(u.segmentArray).toBeTruthy();
    });

    it('should segmentArray 7 into 3', function () {
        //[1,2,3,4,5,6,7], 3) -> [[1,4,7],[2,5],[3,6]]
        var arr = [1, 2, 3, 4, 5, 6, 7];
        var segs = u.segmentArray(arr, 3);
        expect(segs.length).toEqual(3);
        expect(segs[0].length).toEqual(3);
        expect(segs[1].length).toEqual(2);
        expect(segs[2].length).toEqual(2);
        expect(segs[0][0]).toEqual(1);
        expect(segs[0][1]).toEqual(4);
        expect(segs[0][2]).toEqual(7);
        expect(segs[1][0]).toEqual(2);
        expect(segs[1][1]).toEqual(5);
        expect(segs[2][0]).toEqual(3);
        expect(segs[2][1]).toEqual(6);
    });

    it('should segmentArray 7 into 2', function () {
        //[1,2,3,4,5,6,7], 2) -> [[1,3,5,7],[2,4,6]]
        var arr = [1, 2, 3, 4, 5, 6, 7];
        var segs = u.segmentArray(arr, 2);
        expect(segs.length).toEqual(2);
        expect(segs[0].length).toEqual(4);
        expect(segs[1].length).toEqual(3);
        expect(segs[0][0]).toEqual(1);
        expect(segs[0][1]).toEqual(3);
        expect(segs[0][2]).toEqual(5);
        expect(segs[0][3]).toEqual(7);
        expect(segs[1][0]).toEqual(2);
        expect(segs[1][1]).toEqual(4);
        expect(segs[1][2]).toEqual(6);
    });

    it('should segmentArray 6 into 2', function () {
        //[1,2,3,4,5,6], 2) -> [[1,3,5],[2,4,6]]
        var arr = [1, 2, 3, 4, 5, 6];
        var segs = u.segmentArray(arr, 2);
        expect(segs.length).toEqual(2);
        expect(segs[0].length).toEqual(3);
        expect(segs[1].length).toEqual(3);
        expect(segs[0][0]).toEqual(1);
        expect(segs[0][1]).toEqual(3);
        expect(segs[0][2]).toEqual(5);
        expect(segs[1][0]).toEqual(2);
        expect(segs[1][1]).toEqual(4);
        expect(segs[1][2]).toEqual(6);
    });

});


