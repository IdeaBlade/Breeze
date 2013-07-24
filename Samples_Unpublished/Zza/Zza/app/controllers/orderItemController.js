(function() {
    'use strict';

    var ctrlName = 'orderItemController';
    var app = angular.module('app').controller(ctrlName,
        ['$scope', '$routeParams', '$location', 'dataservice', 'util', controller]);
    
    function controller($scope, $routeParams, $location, dataservice, util) {
        
        var cartOrder = dataservice.cartOrder;
        var draftOrder = dataservice.draftOrder;
        var tag = $routeParams.tag;
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
        
        $scope.activeTag = tag;
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
            var item, product, sizes;

            if (tag == 'item') {
                // reached this page from an existing orderItem so id is the orderItemId
                item = getSelectedItem(id);
                if (item) {
                    product = item.product;
                    tag = (product.type === 'beverage') ? 'drinks': product.type;
                    sizes = dataservice.productSizes.byProduct(product);
                }
            } else {
                // reached here from product list page so id is the productId
                product = dataservice.products.byId(id);
                sizes = dataservice.productSizes.byProduct(product);
                item = getOrderItemByProduct(product, sizes[0]);
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
            tabs.forEach(function (t) {
                t.oneChoice = t.type == 'crust'; // can only pick one crust
                if (t.oneChoice) { ensureOneSelected(t); };
                t.columnOptions = util.deal(t.options, 3);
            });

            return tabs;
            
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
            
            if (optionVm.selected) {
                if (itemOption) {
                    orderItem.undeleteOption(itemOption);
                } else { // no itemOption; create one
                    optionVm.itemOption = orderItem.addNewOption(optionVm.productOption);
                }
                
            } else if (itemOption) { // option de-selected; delete
                var deletedOption = orderItem.deleteOption(itemOption);
                if (!deletedOption) {
                    optionVm.itemOption = null; // discard; deleted option no longer in cache
                }
            }
        }
        
        function selectOneOption(tab) {
            var selectedId = parseInt(tab.selectedOptionId);
            // reset selected state for every option on this tab
            tab.options.forEach(function (opt) {
                opt.selected = opt.id === selectedId;
                selectOption(opt);
            });
        }
    }
 
    app.routeResolve[ctrlName] = { dataServiceInit: true };
    
})();