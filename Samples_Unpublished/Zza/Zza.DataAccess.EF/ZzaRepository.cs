using System;
using System.Linq;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using Zza.Model;

namespace Zza.DataAccess.EF
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
        /// Get and set the function returning the current user's StoreId;
        /// typically set by the controller
        /// </summary>
        Func<Guid?> GetUserStoreId { get; set; }

        SaveResult SaveChanges(JObject saveBundle);
        string Reset(string options);
    }

    /// <summary>
    /// Repository (a "Unit of Work" really) of Zza models.
    /// </summary>
    public class ZzaRepository : IZzaRepository
    {
        public ZzaRepository()
        {
            _contextProvider = new EFContextProvider<ZzaContext>();
            _entitySaveGuard = new ZzaEntitySaveGuard();
            _contextProvider.BeforeSaveEntityDelegate += _entitySaveGuard.BeforeSaveEntity;
            GetUserStoreId = () => _guestStoreId;
        }

        public string Metadata
        {
            get { return _contextProvider.Metadata(); }
        }

        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
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
        /// Get and set the function returning the current user's StoreId;
        /// typically set by the controller
        /// </summary>
        public Func<Guid?> GetUserStoreId { get; set; }

        public string Reset(string options)
        {
            // If full reset, delete all additions to the database
            // else delete additions made during this user's session
            var where = options.Contains("fullreset")
                ? "IS NOT NULL"
                : ("= '" + UserStoreId + "'");

            string deleteSql;
            deleteSql = "DELETE FROM [ORDERITEMOPTION] WHERE [STOREID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [ORDERITEM] WHERE [STOREID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [ORDER] WHERE [STOREID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [CUSTOMER] WHERE [STOREID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            return "reset";
        }

        private ZzaContext Context { get { return _contextProvider.Context; } }

        private IQueryable<T> ForCurrentUser<T>(IQueryable<T> query) where T : class, ISaveable
        {
            return query.Where(x => x.StoreId == null || x.StoreId == UserStoreId);
        }

        private Guid UserStoreId
        {
            get
            {
                if (!haveUserStoreId)
                {
                    _userStoreId = GetUserStoreId() ?? _guestStoreId;
                    _entitySaveGuard.UserStoreId = _userStoreId;
                    haveUserStoreId = true;
                }
                return _userStoreId;
            }
        }

        private bool haveUserStoreId;
        private Guid _userStoreId;

        private readonly EFContextProvider<ZzaContext> _contextProvider;
        private readonly ZzaEntitySaveGuard _entitySaveGuard;

        private const string _guestStoreIdName = "12345678-9ABC-DEF0-1234-56789ABCDEF0";
        private static readonly Guid _guestStoreId = new Guid(_guestStoreIdName);
    }
}
