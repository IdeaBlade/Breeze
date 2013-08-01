(function() {
    'use strict';

    var ctrlName = 'orderItemController';
    var app = angular.module('app').controller(ctrlName,
        ['$scope', '$routeParams', '$location', 'dataservice', 'util', controller]);
    
    function controller($scope, $routeParams, $location, dataservice, util) {
  
        var productTag = $routeParams.product || "";
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
        
        $scope.activeProduct = productTag;
        $scope.isItemView = true;
        $scope.orderItem = orderItem;
        $scope.product = info.product;
        $scope.sizeVms = sizeVms;
        $scope.tabVms = tabVms;
        $scope.isDraftOrder = isDraftOrder;
        $scope.addToCart = addToCart;
        $scope.selectOption = selectOption;
        $scope.selectOneOption = selectOneOption;

        /*** Implementation ***/

        function getOrderItemInfo() {
            // id may be productId or orderItemId, depending upon route tag
            var id = +$routeParams.id; // convert to integer w/ '+'
            var orderIdTag = $routeParams.orderId;
            var item, product, sizes;

            if (orderIdTag) {
                // reached this page from an existing orderItem so id is the orderItemId
                item = getSelectedItem(orderIdTag, id);
                if (item) {
                    product = item.product;
                    productTag = product.type;
                    sizes = dataservice.productSizes.byProduct(product);
                }
            } else {
                // reached here from product list page so id is the productId
                product = dataservice.products.byId(id);
                if (product) {
                    sizes = dataservice.productSizes.byProduct(product);
                    item = getOrderItemByProduct(product, sizes[0]);
                }
            }
            return {
                goNext: function () { $location.path('/order/' + productTag); },
                orderItem: item,
                product: product,
                sizes: sizes
            };
        }            
        
        // Get the order item by the order item id.  Returns falsey if not found.
        function getSelectedItem(orderIdTag, id) {
            // Todo: in future, could be the orderId of any order
            var item = orderIdTag == 'cart' ?
                cartOrder.getSelectedItem(id) :
                draftOrder.getSelectedItem(id);
            return item;
        }
        
        // Find an orderItem on the draft order for the given product.  
        // Create a new orderItem if none found.
        function getOrderItemByProduct(product, defaultSize) {

            var prodId = product.id;
            var item = draftOrder.orderItems
                .filter(function (oi) { return oi.productId == prodId; })[0];
            
            if (!item) {
                item = draftOrder.addNewItem(product);
                item.productSize = defaultSize;
            }
            return item;
        }

        function createOptionVms() {
            var options = dataservice.productOptions.byProduct(info.product);

            var itemOptions =
                util.keyArray(orderItem.orderItemOptions, function (o) { return o.productOptionId; });

            return options.map(function (po) {
                var io = itemOptions[po.id];
                return {
                    id: po.id,
                    name: po.name,
                    productOption: po,
                    selected: !!io,
                    itemOption: io
                };
            });
        }

        function createTabVms() {
            // group the productOption viewmodels by type so they can be displayed on tabs
            var tabs = util.groupArray(optionVms,
                function (vm) { return vm.productOption.type; }, 'type', 'options');

            // distribute the options in each tab among 3 columns
            // indicate which tabs allow only one choice
            // indicate which tabs have "count as 2" options
            tabs.forEach(function (t) {
                setTabCostFlags(t);
                t.oneChoice = t.type == 'crust'; // can only pick one crust
                if (t.oneChoice) { ensureOneSelected(t); };
                t.columnOptions = util.deal(t.options, 3);
            });

            return tabs;
            
            function setTabCostFlags(tab) {
                var maxFactor = 0;
                tab.options.forEach(function (o) {
                    maxFactor = Math.max(maxFactor, o.productOption.factor);
                });
                tab.allFree = maxFactor === 0;
                tab.someCostMore = maxFactor > 1;
            }
            
            function ensureOneSelected(tab) {
                // Only one choice allowed among options on the tab
                // Will display with radio buttons which, unlike checkboxes,
                // must bind to something other than the choices.
                // The `tab.selectedOptionId` is that something.
                // p.s.: can't bind to option itself because of Ng circular-ref failure
                tab.selectedOptionId = tab.options[0].id; // default selection
                tab.options.forEach(function (opt) {
                    // override default if any of the options is already selected
                    if (opt.selected) tab.selectedOptionId = opt.id;});                
                selectOneOption(tab);
            }

        }
        
        function createSizeVms() {
            var isPremium = info.product.isPremium;
            return info.sizes.map(function (size) {
                return {
                    id: size.id,
                    name: size.name,
                    price: isPremium ? (size.premiumPrice ||size.price) : size.price,
                };
            });
        }
        
        function addToCart() {
            if (isDraftOrder) {
                //don't need to remove if item is an entity (e.g, SQL version)
                draftOrder.removeItem(orderItem); 
                cartOrder.addItem(orderItem);
                util.logger.info("Added item to cart");
                info.goNext();
            }
        }

        // Add/remove orderItemOption for a single selection
        function selectOption(optionVm) {
            var itemOption = optionVm.itemOption;
            
            if (optionVm.selected) {
                if (itemOption) {
                    orderItem.restoreOption(itemOption);
                } else { // no itemOption; create one
                    optionVm.itemOption = orderItem.addNewOption(optionVm.productOption);
                }
                
            } else if (itemOption) { // option de-selected; remove it
                var removedOption = orderItem.removeOption(itemOption);
                if (!removedOption) {
                    optionVm.itemOption = null; // discard; removed option no longer in cache
                }
            }
        }
        
        function selectOneOption(tab) {
            var selectedId = parseInt(tab.selectedOptionId);
            // reset the selected state for every option on this tab
            tab.options.forEach(function (opt) {
                opt.selected = opt.id === selectedId;
                selectOption(opt);
            });
        }
    }
 
    app.routeResolve[ctrlName] = { dataServiceInit: true };
    
})();