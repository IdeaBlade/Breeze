(function() {
    'use strict';

    var ctrlName = 'productOrderController';
    var app = angular.module('app').controller(ctrlName,
        ['$scope', '$routeParams', '$location', 'dataservice', 'util', controller]);
    
    function controller($scope, $routeParams, $location, dataservice, util) {
        
        var cartOrder = dataservice.cartOrder;
        var draftOrder = dataservice.draftOrder;
        var info = getOrderItemInfo();
        var orderItem = info.orderItem;
        
        // bail out if no orderItem
        if (!orderItem) {
            info.goNext();
            return;
        }
       
        // Have orderItem; build out viewmodel
        var isDraftOrder = orderItem.order === dataservice.draftOrder;
        var optionVms = createOptionVms();        
        var tabVms = createTabVms();
        var sizeVms = createSizeVms();
                
        $scope.orderItem = orderItem;
        $scope.product = info.product;
        $scope.sizeVms = sizeVms;
        $scope.tabVms = tabVms;
        $scope.isDraftOrder = isDraftOrder;
        $scope.addToCart = addToCart;
        $scope.selectOption = selectOption;

        /*** Implementation ***/

        function getOrderItemInfo() {
            // id may be productId or orderItemId, depending upon route tag
            var id = +$routeParams.id; // convert to integer w/ '+'
            var tag = $routeParams.tag;
            var item, product, sizes;

            if (tag == 'item') {
                // reached this page from an existing orderItem so id is the orderItemId
                item = getSelectedItem(id);
                if (item) {
                    product = item.product;
                    tag = product.type;
                    sizes = dataservice.productSizes.byProduct(product);
                }
            } else {
                // reached here from product list page so id is the productId
                product = dataservice.products.byId(id);
                sizes = dataservice.productSizes.byProduct(product);
                item = getOrderItemByProductId(id, sizes[0]);
            }
            return {
                tag: tag,
                goNext: function () { $location.path('/order/' + tag); },
                orderItem: item,
                product: product,
                sizes: sizes
            };
        }            
        
        // Get the order item by the order item id.  Returns falsey if not found.
        function getSelectedItem(id) {
            var item = cartOrder.getSelectedItem(id) || draftOrder.getSelectedItem(id);
            return item;
        }
        
        // Find an orderItem on the draft order for the given product.  
        // Create a new orderItem if none found.
        function getOrderItemByProductId(id, defaultSize) {

            var item = draftOrder.orderItems
                .filter(function (oi) { return oi.productId == id; })[0];
            
            if (!item) {
                item = draftOrder.addNewItem(id);
                item.quantity = item.quantity || 1;
                item.productSizeId = item.productSizeId || defaultSize.id;
            }
            return item;
        }

        function createOptionVms() {
            var options = dataservice.productOptions.byTag(info.tag);
            // Todo: filter special case for "Plain Pizza"

            var itemOptions =
                util.keyArray(orderItem.orderItemOptions, function (o) { return o.productOptionId; });

            return options.map(function (o) {
                var io = itemOptions[o.id];
                return {
                    id: o.id,
                    option: o,
                    selected: !!io,
                    itemOption: io
                };
            });
        }

        function createTabVms() {
            // group the productOption viewmodels by type so they can be displayed on tabs
            var tabs = util.groupArray(optionVms,
                function (vm) { return vm.option.type; }, 'type', 'options');

            // distribute the options in each tab among 3 columns
            tabs.forEach(function (t) {
                t.options = util.deal(t.options, 3);
            });

            return tabs;
        }
        
        function createSizeVms() {
            var isPremium = info.product.isPremium;
            return info.sizes.map(function (size) {
                return {
                    id: size.id,
                    name: size.name,
                    price: isPremium ? size.premiumPrice : size.price,
                };
            });
        }
        
        function addToCart() {
            if (isDraftOrder) {
                cartOrder.addItem(orderItem);
                util.logger.info("Added item to cart");
                info.goNext();
            }
        }

        // Add/remove orderItemOption for a single selection
        function selectOption(optionVm) {
            var itemOption = optionVm.itemOption;
            var ea = itemOption && itemOption.entityAspect;
            
            if (optionVm.selected) {
                if (itemOption) {
                    // must be an existing option that was deselected and marked-for-delete; revert
                    if (ea.entityState.isDeleted()) {
                        ea.setUnchanged(); 
                    } else {        
                        throw new Error(
                            "itemOption has unexpected EntityState, " + ea.entityState.name);
                    }
                } else { // no itemOption; create one
                    optionVm.itemOption = orderItem.addNewOption(optionVm.option.id);
                }
                
            } else if (itemOption) { // option de-selected; delete
                if (ea.entityState.isAdded()) {
                    optionVm.itemOption = null; // discard a newly created option
                }
                ea.setDeleted(); // deletes existing or detaches an added
            } else {
                throw new Error("deselected but no itemOption to delete");
            }
        }
    }
 
    app.routeResolve[ctrlName] = { dataServiceInit: true };
    
})();