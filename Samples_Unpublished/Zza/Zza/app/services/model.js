(function() {
    'use strict';
    
    angular.module('app').factory('model',
    ['config', function (config) {
        
        var imageBase = config.imageBase;
        var model = {
            configureMetadataStore: configureMetadataStore,
            Customer: Customer,
            Order: Order,
            OrderItem: OrderItem
        };

        return model;
    
        function configureMetadataStore(metadataStore) {
            registerCustomer(metadataStore);
            registerOrder(metadataStore);
            registerOrderItem(metadataStore);
            registerOrderItemOption(metadataStore);
            registerProduct(metadataStore);
        }
        
        //#region Customer
        function Customer() {/* nothing inside */ }
        
        function registerCustomer(metadataStore) {
            metadataStore.registerEntityTypeCtor('Customer', Customer);
            
            // extend Customer
            Object.defineProperty(Customer.prototype, "fullName", {
                enumerable: true,
                get: function () { return this.firstName + " " + this.lastName; }
            });
        }
        //#endregion

        //#region Order
        function Order() {/* nothing inside */ }

        function registerOrder(metadataStore) {
            metadataStore.registerEntityTypeCtor('Order', Order);

            Order.create = create;
            Order.prototype.getSelectedItem = getSelectedItem;
            Order.prototype.addNewItem = addNewItem;
            Order.prototype.addItem = addItem;
            Order.prototype.removeItem = removeItem;
            
            function create(manager, orderInit) {
                var init = {
                    orderDate: new Date(),
                    deliveryDate: new Date() // projected //todo: add time
                };
                breeze.core.extend(init, orderInit);
                return manager.createEntity('Order', init);
            }
            
            function getSelectedItem(id) {
                var isMatch = function (oi) { return oi.id === id; };
                return this.orderItems.filter(isMatch)[0] || null;
            }
            
            // create new item and add to existing order
            function addNewItem(product) {
                var orderItem = this.entityAspect.entityManager
                    .createEntity('OrderItem', {
                        order: this,
                        product: product
                    });
                return orderItem;
            }
            // attach existing item to order
            function addItem(item) {
                item.order = this; // rewrite for mongo
            }
            // detach existing item from order
            function removeItem(item) {
                item.order = null;
            }
        }      
        //#endregion

        //#region OrderItem
        function OrderItem() {
            this.quantity = 1;
        }
        
        function registerOrderItem(metadataStore) {
            metadataStore.registerEntityTypeCtor('OrderItem', OrderItem);

            OrderItem.prototype.addNewOption = addNewOption;
            OrderItem.prototype.removeOption = removeOption;
            OrderItem.prototype.restoreOption = restoreOption;
            
            function addNewOption(productOption) {
                var orderItemOption = this.entityAspect.entityManager
                    .createEntity('OrderItemOption', {
                        orderItem: this,
                        productOption: productOption
                    });
                return orderItemOption;
            }

            function removeOption(option) { // Remove means "delete"               
                option.entityAspect.setDeleted();
                return (option.entityAspect.entityState.isDeleted()) ? option : null;
            }
            
            function restoreOption(option) {
                if (option.entityAspect.entityState.isDeleted()) {
                    option.entityAspect.setUnchanged();
                }
            }
        }
        //#endregion

        //#region OrderItemOption       
        function OrderItemOption() {
            this.quantity = 1;
        }

        function registerOrderItemOption(metadataStore) {
            metadataStore.registerEntityTypeCtor('OrderItemOption', OrderItemOption);
        }
        //#endregion 
        
        //#region Product        
        function registerProduct(metadataStore) {
            metadataStore.registerEntityTypeCtor('Product', Product);

            function Product() { /* nothing inside */ }
            
            Object.defineProperty(Product.prototype, "img", {
                enumerable: true,
                get: function () { return imageBase + this.image; }
            });
            
            Object.defineProperty(Product.prototype, "productSizeIds", {
                enumerable: true,
                get: function () {
                    if (!this.__productSizeIds) {
                        var sizeIds = this.sizeIds;
                        
                        if (sizeIds) {
                            // sizeIds is in the form "'10,11,12'"; convert to integer array
                            var sizeArr = sizeIds.slice(1, -1).split(',');
                            this.__productSizeIds = sizeArr.map(
                                function(s) { return parseInt(s); });
                        } else {
                            this.__productSizeIds = [];
                        }
                    }
                    return this.__productSizeIds;
                },
                set: function (value) {this.__productSizeIds = value;}
            });
        }
        //#endregion      
   
    }]);
    
})();