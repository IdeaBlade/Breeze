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
                        ordered: new Date(),
                        delivered: new Date()  // projected //todo: add time
                    };
                    breeze.core.extend(init, orderInit);
                    return manager.createEntity('Order', init);
                }

                function getSelectedItem(id) {
                    var isMatch = function (oi) { return oi.ref === id; };
                    return this.orderItems.filter(isMatch)[0];
                }

                // create new item and add to existing order
                function addNewItem(product) {
                    var orderItem = orderItemType.createInstance( {
                            ref: getNextItemId(this),
                            productId: product.Id,
                            name: product.type
                        });
                    return orderItem;
                }

                function getNextItemId(order){
                    var id = order._nextId;
                    if (!id) {
                        // not cached; calc as 1 + highest item.ref value
                        var items = order.items || [];
                        id = 1 + items.reduce(function(p,c){return Math.max(p, c.ref);},0);
                    }
                    order._nextId = id + 1;
                    return id;
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

                /*** navigation properties ***/
                Object.defineProperty(OrderItem.prototype, "product", {
                    get: function () {
                        if (this._product === undefined){
                            this._product =
                                this.entityManager.getEntityByKey('Product', this.productId);
                        }
                        return this._product;
                    },
                    set: function (product) {
                        this._product = product;
                        this.productId = product.id;
                        this.name = product.name;
                    }
                });

                Object.defineProperty(OrderItem.prototype, "productSize", {
                    get: function () {
                        if (this._productSize === undefined){
                            this._productSize =
                                this.entityManager.getEntityByKey('ProductSize', this.productSizeId);
                        }
                        return this._productSize;
                    },
                    set: function (size) {
                        this._productSize = size;
                        this.productSizeId = size.id;
                        this.size = size.name;
                    }
                });
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