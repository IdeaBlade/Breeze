(function() {
    'use strict';
    
    angular.module('app').factory('model',
    ['breeze', 'config', function(breeze, config) {
 
        var model = {
            configureMetadataStore: configureMetadataStore
        };
        var imageBase = config.imageBase;
        return model;
    
        //#region implementation
        function configureMetadataStore(metadataStore) {
            registerCustomer(metadataStore);
            registerProduct(metadataStore);
        }
    
        function registerCustomer(metadataStore) {
            metadataStore.registerEntityTypeCtor('Customer', CustomerCtor);

            function CustomerCtor() {/* nothing inside */ }
            Object.defineProperty(CustomerCtor.prototype, "fullName", {
                get: function () { return this.firstName + " " + this.lastName; }
            });
        }
        
        function registerProduct(metadataStore) {
            metadataStore.registerEntityTypeCtor('Product', ProductCtor);
            
            function ProductCtor() { /* nothing inside */ }
            Object.defineProperty(ProductCtor.prototype, "img", {
                get: function () { return imageBase + this.image; }
            });
        }
        //#endregion
   
    }]);
    
})();