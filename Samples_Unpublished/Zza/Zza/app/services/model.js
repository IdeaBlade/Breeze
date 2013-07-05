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
            registerOrderItem(metadataStore);
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
        
        function registerOrderItem(metadataStore) {
            metadataStore.registerEntityTypeCtor('OrderItem', OrderItemCtor, initializer);

            function OrderItemCtor() {
                 this.quantity = 1;
            }

            OrderItemCtor.prototype.calcPrice = function() {
                var size = this.productSize;
                var product = this.product;
                if (size && product) {
                    var isPremium = product.isPremium && !!size.premiumPrice;
                    var unitPrice = isPremium ? size.premiumPrice : size.price;
                    this.unitPrice = unitPrice;
                    this.totalPrice = this.quantity * unitPrice;
                }
            };
            
            function initializer(entity) {
                // Todo: Is it really necessary to recalc price on property changes
                // of should it be called on demand (e.g., before save)?
                entity.entityAspect.propertyChanged.subscribe(function (args) {
                    var pname = args.propertyName;
                    if (pname == 'quantity' ||
                        pname == 'productSizeId' ||
                        pname === 'productId') {
                        entity.calcPrice();
                    }                   
                });
                if (entity.unitPrice === 0 ) {
                    entity.calcPrice();
                }
            }
        }
        //#endregion
   
    }]);
    
})();