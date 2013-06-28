'use strict';

describe('testController', function () {
    var scope, $controllerFactory, loggerStub, ctorArgs;
    
    beforeEach(module('app'));
    
    beforeEach(inject(function($controller, $rootScope) {
        scope = $rootScope.$new();
        $controllerFactory = $controller;
    }));

    beforeEach(function () {
        loggerStub = sinon.stub(new zzaTestFns.FakeLogger);
        ctorArgs = {
            $scope: scope,
            $routeParams: {},
            dataservice: {},
            logger: loggerStub
        };
    }) ;

    it('breeze should be present', function () {
        expect(breeze).toBeDefined();
    });

    it('app module should be present', function () {
        expect(angular.module('app')).toBeDefined();
    });

    it ('"orderId" should be "<no id>" when no id in routeParams', function() {
        $controllerFactory("testCtrl", ctorArgs);
        expect(scope.orderId).toBe('<no id>');
    });
    
    it('"orderId" should be same as id in routeParams', function () {
        ctorArgs.$routeParams.id ='42';
        $controllerFactory("testCtrl",ctorArgs);
        expect(scope.orderId).toEqual('42');
    });
    
    it('should expose products from the dataservice', function () {
        var products = ['some', 'thing'];
        ctorArgs.dataservice = {products: products};
        $controllerFactory("testCtrl",ctorArgs);
        expect(scope.products).toBe(products);
    });

    it('should report something to the logger', function() {
        $controllerFactory("testCtrl", ctorArgs);
        sinon.assert.calledOnce(loggerStub.log);
        sinon.assert.calledWithMatch(loggerStub.log, /created/i);
    });
});


