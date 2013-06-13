(function() {
    'use strict';
    
    angular.module('app').factory('model',
    ['breeze', function(breeze) {
 
        var model = {
            configureMetadataStore: configureMetadataStore
        };

        return model;
    
        //#region implementation
        function configureMetadataStore(metadataStore) {
            registerCustomer(metadataStore);
        }
    
        function registerCustomer(metadataStore) {
            metadataStore.registerEntityTypeCtor('Customer', CustomerCtor);
        
            function CustomerCtor() { }
            CustomerCtor.prototype.fullName = function () {
                return this.firstName + " " + this.lastName;
            };
        }
        //#endregion
   
    }]);
    
})();