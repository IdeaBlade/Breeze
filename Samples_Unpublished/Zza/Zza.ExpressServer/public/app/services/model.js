/*** Mongo-oriented version of model.js ***/
(function() {
    'use strict';

    angular.module('app').factory('model',
        ['config', function (config) {

            var imageBase = config.imageBase;
            var orderItemType, orderItemOptionType;

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

                    var orderItem = orderItemType.createInstance( {
                            productId: productId
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
                        breeze.core.arrayRemoveItem(this.orderItems, item);
                        item.orderId = 0;
                    }
                    resetSeqNums(this);
                }
            }
            //#endregion

            //#region OrderItem
            function OrderItem() {
                this.quantity = 1;
            }

            function registerOrderItem(metadataStore) {
                metadataStore.registerEntityTypeCtor('OrderItem', OrderItem, initializer);

                orderItemType = metadataStore.getEntityType('OrderItem')  ;

                OrderItem.prototype.addNewOption = addNewOption;
                OrderItem.prototype.deleteOption = deleteOption;
                OrderItem.prototype.undeleteOption = undeleteOption;
                OrderItem.prototype.calcPrice = calcPrice;

                function addNewOption(productOption) {
                    var orderItemOption = this.entityAspect.entityManager
                        .createEntity('OrderItemOption', {
                            orderItemId: this.id,
                            productOption: productOption
                        });
                    return orderItemOption;
                }

                function undeleteOption(option) {
                    if (option.entityAspect.entityState.isDeleted()) {
                        option.entityAspect.setUnchanged();
                    }
                }

                function deleteOption(option) {
                    option.entityAspect.setDeleted();
                    return (option.entityAspect.entityState.isDeleted()) ? option : null;
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

            //#region OrderItemOption
            function OrderItemOption() {
                this.quantity = 1;
            }

            function registerOrderItemOption(metadataStore) {
                metadataStore.registerEntityTypeCtor('OrderItemOption', OrderItemOption);

                orderItemOptionType = metadataStore.getEntityType('OrderItemOption');
            }

            //#endregion

            //#region Product
            function registerProduct(metadataStore) {
                metadataStore.registerEntityTypeCtor('Product', Product);

                function Product() { /* nothing inside */ }
                Object.defineProperty(Product.prototype, "img", {
                    get: function () { return imageBase + this.image; }
                });

                Object.defineProperty(Product.prototype, "productSizeIds", {
                    get: function () { return this.sizeIds || []; },
                    set: function () {/* do nothing */;}
                });
            }
            //#endregion


        }]);

})();