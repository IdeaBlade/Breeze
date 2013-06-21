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
        }
    
        function registerCustomer(metadataStore) {
            metadataStore.registerEntityTypeCtor('Customer', CustomerCtor);
            metadataStore.registerEntityTypeCtor('Product', ProductCtor, ProductInitializer);
            function CustomerCtor() { }
            CustomerCtor.prototype.fullName = function () {
                return this.firstName + " " + this.lastName;
            };

            function ProductCtor() { // in ctor so we can serialize it to local storage
                this.img = '';
            }
            function ProductInitializer(self) {
                self.img = imageBase+self.image; // handle null/bad images with placeholder
            }
        }
        //#endregion
   
    }]);
    
})();