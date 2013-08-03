/*** Mongo-oriented version of model.js ***/
(function() {
    'use strict';

    angular.module('app').factory('model',
        ['util', function (util) {

            var imageBase = util.config.imageBase;
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
                registerProductOption(metadataStore);
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
                metadataStore.registerEntityTypeCtor('Order', Order, initializer);

                Order.create = create;
                Order.prototype.getSelectedItem = getSelectedItem;
                Order.prototype.addNewItem = addNewItem;
                Order.prototype.addItem = addItem;
                Order.prototype.removeItem = removeItem;

                function initializer(order) {

                    order.entityAspect.propertyChanged.subscribe(function(args) {
                        var pname = args.propertyName;
                     /*
                        var path = this.complexAspect.getPropertyPath();
                        var pname = args.propertyName;
                        if (pname == path+'quantity' ||
                            pname == path+'productSizeId' ||
                            pname === path+'productId') {
                            item.calcPrice();
                        }
                    });
                    // calculate immediately if item has no unitPrice (i.e., is new)
                    if (item.unitPrice === 0 ) {
                        item.calcPrice();
                    }
                    */
                    });
                }

                function create(manager, orderInit) {
                    var init = {
                        ordered: new Date(),
                        delivered: new Date()  // projected //todo: add time
                    };
                    breeze.core.extend(init, orderInit);
                    return manager.createEntity('Order', init);
                }

                function getSelectedItem(id) { // id == 1 + item's index
                    return this.orderItems[id - 1] || null;
                }

                // create new item and add to existing order
                function addNewItem(product) {
                    var item = orderItemType.createInstance();
                    item.order = this;
                    this.orderItems.push(item);
                    item.product = product;
                    return item;
                }

                // attach existing item to order
                function addItem(item) {
                    var items = this.orderItems;
                    item.order = this;
                    if (items.indexOf(item) == -1){
                        items.push(item);
                    }
                }

                // remove existing item from order
                function removeItem(item) {
                    var ix = this.orderItems.indexOf(item);
                    item.order = null;
                    if (ix > -1){
                        this.orderItems.splice(ix, 1);
                    }
                }
            }
            //#endregion

            //#region OrderItem
            function OrderItem() {
                this.quantity = 1;
            }

            function registerOrderItem(metadataStore) {
                metadataStore.registerEntityTypeCtor('OrderItem', OrderItem);

                orderItemType = metadataStore.getEntityType('OrderItem')  ;

                OrderItem.prototype.addNewOption = addNewOption;
                OrderItem.prototype.removeOption = removeOption;
                OrderItem.prototype.restoreOption = addOption;
                OrderItem.prototype.calcPrice = calcPrice;

                function addNewOption(productOption) {
                    var option = orderItemType.createInstance();
                    option.orderItem = this;
                    option.productOption = productOption;
                    this.orderItemOptions.push(option);
                    return option;
                 }

                function addOption(option) {
                    var options = this.orderItemOptions;
                    option.orderItem = this;
                    if (options.indexOf(option) == -1){
                        options.push(option);
                    }
                }

                function removeOption(option) {
                    var ix = this.orderItemOptions.indexOf(option);
                    option.orderItem = null;
                    if (ix > -1){
                        this.orderItemOptions.splice(ix, 1);
                    }
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

                Object.defineProperty(OrderItem.prototype, "id", {
                    enumerable: true,
                    get: function () {
                        var ix = -1;
                        var parent = this.complexAspect.parent;
                        if (parent)  {
                            ix = parent.orderItems.indexOf(this);
                        }
                        return ix + 1; // id == 1 + item's index
                    }
                });

                /*** navigation properties ***/
                Object.defineProperty(OrderItem.prototype, "product", {
                    enumerable: true,
                    get: function () {
                        var id = this.productId;
                        return (id) ? this.product = util.getEntityByIdFromObj(this, 'Product', id) : null;
                    },
                    set: function (product) {
                        if (product) {
                            this.productId = product.id;
                            this.name = product.name;
                            this.type = product.type;
                        } else {
                            this.productId = 0;
                            this.name = "";
                            this.type = "";
                        }
                    }
                });

                Object.defineProperty(OrderItem.prototype, "productSize", {
                    enumerable: true,
                    get: function () {
                        var id =  this.productSizeId;
                        return (id) ? this.productSize = util.getEntityByIdFromObj(this, 'ProductSize', id) : null;
                    },
                    set: function (size) {
                        if (size) {
                            this.productSizeId = size.id;
                            this.size = size.name;
                        } else {
                            this.productSizeId = 0;
                            this.size = "";
                        }
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

                /*** navigation properties ***/
                Object.defineProperty(OrderItem.prototype, "productOption", {
                    enumerable: true,
                    get: function () {
                        var id =  this.productOptionId;
                        return (id) ? this.productOption = util.getEntityByIdFromObj(this, 'ProductOption', id) : null;
                    },
                    set: function (po) {
                        if (po) {
                            this.productOptionId = po.id;
                            this.name = po.name;
                        } else {
                            this.productOptionId = 0;
                            this.name = "";
                        }
                    }
                });
            }
            //#endregion

            //#region Product
            function registerProduct(metadataStore) {
                metadataStore.registerEntityTypeCtor('Product', Product);

                function Product() { /* nothing inside */ }

                Object.defineProperty(Product.prototype, "productSizeIds", {
                    enumerable: true,
                    get: function () { return this.sizeIds || []; }
                });
            }
            //#endregion

            //#region ProductOption
            function registerProductOption(metadataStore) {
                metadataStore.registerEntityTypeCtor('ProductOption', ProductOption);

                function ProductOption() { /* nothing inside */ }
                Object.defineProperty(ProductOption.prototype, "isPizzaOption", {
                    enumerable: true,
                    get: function () { return this.productTypes.indexOf('pizza') > -1; }
                });

                Object.defineProperty(ProductOption.prototype, "isSaladOption", {
                    enumerable: true,
                    get: function () { return this.productTypes.indexOf('salad') > -1 }
                });
            }
            //#endregion
        }]);

})();