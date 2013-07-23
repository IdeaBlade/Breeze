(function() {
    'use strict';
    
    angular.module('app').factory('model',
    ['breeze', 'util', function (breeze, util) {
        
        var imageBase = util.config.imageBase;
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
            registerProduct(metadataStore);
        }
        
        //#region Customer
        function Customer() {/* nothing inside */ }
        
        function registerCustomer(metadataStore) {
            metadataStore.registerEntityTypeCtor('Customer', Customer);
            
            // extend Customer
            Object.defineProperty(Customer.prototype, "fullName", {
                get: function () { return this.firstName + " " + this.lastName; }
            });
        }
        //#endregion

        //#region Order
        function Order() {/* nothing inside */ }

        function registerOrder(metadataStore) {
            metadataStore.registerEntityTypeCtor('Order', Order);

            Order.create = create;
            Order.prototype.addNewItem = addNewItem;
            Order.prototype.getSelectedItem = getSelectedItem;
            Order.prototype.addItem = addItem;
            
            function create(manager, orderInit) {
                var init = {
                    orderStatusId: 5, // known safe value for 'pending'
                    orderDate: new Date(),
                    deliveryDate: new Date()
                };
                breeze.core.extend(init, orderInit);
                return manager.createEntity('Order', init);
            }
            
            function getSelectedItem(id) {
                var isMatch = function (oi) { return oi.id === id; };
                return this.orderItems.filter(isMatch)[0];
            }
            
            // create new item and add to existing order
            function addNewItem(productId) {
                var orderItem = this.entityAspect.entityManager
                    .createEntity('OrderItem', {
                        orderId: this.id,
                        productId: productId,
                        quantity: 1
                    });
                return orderItem;
            }
            // attach existing item to order
            function addItem(item) {
                item.order = this; // rewrite for mongo
            }
            // needed only where item is not entity (e.g, mongo version)
            // would be part of addItem logic
            function removeItem(item) {
                if (item.order) {
                    breeze.core.arrayRemoveItem(item.order.orderItems, item);
                    item.orderId = 0;
                }
            }
        }      
        //#endregion

        //#region OrderItem
        function OrderItem() {
            this.quantity = 1;
        }
        
        function registerOrderItem(metadataStore) {
            metadataStore.registerEntityTypeCtor('OrderItem', OrderItem, initializer);

            OrderItem.prototype.addNewOption = addNewOption;
            OrderItem.prototype.calcPrice = calcPrice;
            
            function addNewOption(productOptionId) {
                var orderItemOption = this.entityAspect.entityManager
                    .createEntity('OrderItemOption', {
                        orderItemId: this.id,
                        productOptionId: productOptionId,
                        quantity: 1
                    });
                return orderItemOption;
            }
            
            function calcPrice() {
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
        
        //#region Product        
        function registerProduct(metadataStore) {
            metadataStore.registerEntityTypeCtor('Product', Product);

            function Product() { /* nothing inside */ }
            Object.defineProperty(Product.prototype, "img", {
                get: function () { return imageBase + this.image; }
            });
        }
        //#endregion
        
   
    }]);
    
})();