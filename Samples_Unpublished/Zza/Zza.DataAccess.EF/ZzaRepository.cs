using System;
using System.Data.Common;
using System.Linq;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using Zza.Interfaces;
using Zza.Model;

namespace Zza.DataAccess.EF
{
    /// <summary>
    /// Repository (a "Unit of Work" really) of Zza models.
    /// </summary>
    public class ZzaRepository : IZzaRepository
    {
        public ZzaRepository()
        {
            _contextProvider = new EFContextProvider<ZzaContext>();
        }

        public string Metadata
        {
            get { return _contextProvider.Metadata(); }
        }

        public object SaveChanges(object saveBundle)
        {
            prepSaveChanges();
            return _contextProvider.SaveChanges(saveBundle as JObject);
        }

        private void prepSaveChanges()
        {
            var connection = (DbConnection) _contextProvider.GetDbConnection();
            var saveGuard = new ZzaSaveGuard(() => new ZzaSaveDataProvider(connection), UserStoreId);
            _contextProvider.BeforeSaveEntitiesDelegate += saveGuard.BeforeSaveEntities;
        }

        public IQueryable<Customer> Customers
        {
            get { return ForCurrentUser(Context.Customers); }
        }

        public IQueryable<Order> Orders
        {
            get { return ForCurrentUser(Context.Orders); }
        }

        /// <summary>
        /// Get a reference object whose properties
        /// are the Zza reference collections.
        /// </summary>
        /// <returns>
        /// Returns one object, not an IQueryable, 
        /// whose properties are "OrderStatuses", "Products", 
        /// "ProductOptions", "ProductSizes".
        /// </returns>
        public object Lookups
        {
            get 
            {
                var lookups = new { OrderStatuses, Products, ProductOptions, ProductSizes};
                return lookups;
            }
        }

        #region Reference Collections for testing; not exposed by the controller 

        public IQueryable<OrderStatus> OrderStatuses
        {
            get { return Context.OrderStatuses; }
        }

        public IQueryable<Product> Products
        {
            get { return Context.Products; }
        }

        public IQueryable<ProductOption> ProductOptions
        {
            get { return Context.ProductOptions; }
        }

        public IQueryable<ProductSize> ProductSizes
        {
            get { return Context.ProductSizes; }
        }

        #endregion

        /// <summary>
        /// Get and set current user's StoreId;
        /// typically set by the controller
        /// </summary>
        public Guid UserStoreId
        {
            get { return _userStoreId; }
            set {
                _userStoreId = (value == Guid.Empty) ? Config.GuestStoreId : value;
            }
        }
        private Guid _userStoreId = Config.GuestStoreId;

        private ZzaContext Context { get { return _contextProvider.Context; } }

        private IQueryable<T> ForCurrentUser<T>(IQueryable<T> query) where T : class, ISaveable
        {
            return query.Where(x => x.StoreId == null || x.StoreId == UserStoreId);
        }

        private readonly EFContextProvider<ZzaContext> _contextProvider;
    }
}
