'use strict';

describe('testController', function () {
    var scope, $ctlFactory, logger, ctorArgs;

    beforeEach(module('app'));
    
    beforeEach(inject(function($controller, $rootScope) {
        scope = $rootScope.$new();
        $ctlFactory = $controller;
    }));

    beforeEach(function () {
        logger = sinon.stub({ log: function () { } });
        ctorArgs = {
            $scope: scope,
            $routeParams: {},
            dataservice: {},
            logger: logger
        };
    }) ;


    it('breeze should be present', function () {
        expect(breeze).toBeDefined();
    });

    it('app module should be present', function () {
        expect(angular.module('app')).toBeDefined();
    });

    it ('"orderId" should be "<no id>" when no id in routeParams', function() {
        var ctrl = $ctlFactory("testCtrl", ctorArgs);
        expect(scope.orderId).toBe('<no id>');
    });
    it('"orderId" should be same as id in routeParams', function () {
        ctorArgs.$routeParams.id ='42';
        var ctrl = $ctlFactory("testCtrl",ctorArgs);
        expect(scope.orderId).toEqual('42');
    });
    it('should expose products from the dataservice', function () {
        var products = ['some', 'thing'];
        ctorArgs.dataservice.products = products;
        var ctrl = $ctlFactory("testCtrl",ctorArgs);
        expect(scope.products).toBe(products);
    });

    it('should report something to the logger', function() {
        var ctrl = $ctlFactory("testCtrl", ctorArgs);
        expect(logger.log.calledOnce).toBeTruthy();
        expect(logger.log.calledWithMatch(/created/i)).toBeTruthy();
    });
});


