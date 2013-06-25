/* TestFns with Jasmine dependencies */
(function () {
    'use strict';
    var fns = zzaTestFns;

    fns.createSmallOrder = createSmallOrder;

    // The em is mandatory; customer can be assigned later
    function createSmallOrder(em, customer) {
        var order;
        var orderItem;
        var orderItemOptions;
        order = em.createEntity('Order', {
            orderStatusId: 1, // ordered
            orderDate: new Date(2013, 5, 30, 12, 40, 0, 0),
            deliveryDate: new Date(2013, 5, 30, 12, 40, 0, 0),
            itemsTotal: 15.10
        });
        if (customer) {
            order.customerId = customer.id;
        }
        orderItem = em.createEntity('OrderItem', {
            orderId: order.id,
            productId: 2,
            productSizeId: 2,
            quantity: 1,
            unitPrice: 12.40,
            totalPrice: 15.10
        });
        orderItemOptions = [
            em.createEntity('OrderItemOption', {
                orderItemId: orderItem.id,
                productOptionId: 45,
                quantity: 2,
                price: 2.70
            }),
            em.createEntity('OrderItemOption', {
                orderItemId: orderItem.id,
                productOptionId: 57,
                quantity: 1,
                price: 0
            })
        ];

        return {
            order: order,
            orderItems: [orderItem],
            orderItemOptions: orderItemOptions
        };
    }
})();
