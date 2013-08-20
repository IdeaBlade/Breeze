/*** Mongo-oriented version of model.js ***/
(function() {
    'use strict';

    angular.module('app').factory('model',['util', model]);

    function model(util) {

        var orderItemType, orderItemOptionType;
        var getEntityByIdFromObj = util.getEntityByIdFromObj

        var _model = {
            configureMetadataStore: configureMetadataStore
            // registration methods add
            //  Customer,
            //  Order
        };

        return _model;

        function configureMetadataStore(metadataStore) {
            registerCustomer(metadataStore);
            registerOrder(metadataStore);
            registerOrderItem(metadataStore);
            registerOrderItemOption(metadataStore);
            registerProduct(metadataStore);
            registerProductOption(metadataStore);
        }

        function registerCustomer(metadataStore) {

            metadataStore.registerEntityTypeCtor('Customer', Customer);
            _model.Customer = Customer;

            function Customer() {/* empty ctor */ }
            Object.defineProperty(Customer.prototype, "fullName", {
                enumerable: true,
                get: function () { return this.firstName + " " + this.lastName; }
            });
        }

        function registerOrder(metadataStore) {
            metadataStore.registerEntityTypeCtor('Order', Order);
            _model.Order = Order;

            function Order() {/* empty ctor*/ }
            Order.create = create;
            Order.prototype.getSelectedItem = getSelectedItem;
            Order.prototype.addNewItem = addNewItem;
            Order.prototype.addItem = addItem;
            Order.prototype.removeItem = removeItem;

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

        function registerOrderItem(metadataStore) {
            metadataStore.registerEntityTypeCtor('OrderItem', OrderItem);
            orderItemType = metadataStore.getEntityType('OrderItem');

            function OrderItem() {
                this.quantity = 1;
            }
            OrderItem.prototype.addNewOption = addNewOption;
            OrderItem.prototype.removeOption = removeOption;
            OrderItem.prototype.restoreOption = addOption;

            function addNewOption(productOption) {
                var option = orderItemOptionType.createInstance();
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
                    return (id) ? this.product = getEntityByIdFromObj(this, 'Product', id) : null;
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
                    return (id) ? this.productSize = getEntityByIdFromObj(this, 'ProductSize', id) : null;
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

        function registerOrderItemOption(metadataStore) {
            metadataStore.registerEntityTypeCtor('OrderItemOption', OrderItemOption);
            orderItemOptionType = metadataStore.getEntityType('OrderItemOption');

            function OrderItemOption() {
                this.quantity = 1;
            }

            /*** navigation properties ***/
            Object.defineProperty(OrderItemOption.prototype, "productOption", {
                enumerable: true,
                get: function () {
                    var id =  this.productOptionId;
                    return (id) ? this.productOption = getEntityByIdFromObj(this, 'ProductOption', id) : null;
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

        function registerProduct(metadataStore) {
            metadataStore.registerEntityTypeCtor('Product', Product);

            function Product() { /* nothing inside */ }

            Object.defineProperty(Product.prototype, "productSizeIds", {
                enumerable: true,
                get: function () { return this.sizeIds || []; }
            });
        }

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
    }

})();