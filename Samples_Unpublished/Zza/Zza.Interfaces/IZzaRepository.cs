using System;
using System.Linq;
using Zza.Model;

namespace Zza.Interfaces
{
    public interface IZzaRepository
    {
        string Metadata { get; }
        IQueryable<Customer> Customers { get; }
        IQueryable<Order> Orders { get; }

        /// <summary>
        /// Get a reference object whose properties
        /// are the Zza reference collections.
        /// </summary>
        /// <returns>
        /// Returns one object, not an IQueryable, 
        /// whose properties are "OrderStatuses", "Products", 
        /// "ProductOptions", "ProductSizes".
        /// </returns>
        object Lookups { get; }

        IQueryable<OrderStatus> OrderStatuses { get; }
        IQueryable<Product> Products { get; }
        IQueryable<ProductOption> ProductOptions { get; }
        IQueryable<ProductSize> ProductSizes { get; }

        /// <summary>
        /// Get and set the current user's StoreId;
        /// typically set by the controller
        /// </summary>
        Guid UserStoreId { get; set; }

        object SaveChanges(object saveBundle);

    }
}