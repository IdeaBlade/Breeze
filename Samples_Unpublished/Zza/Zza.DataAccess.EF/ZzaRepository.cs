using System;
using System.Linq;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using Zza.Model;

namespace Zza.DataAccess.EF
{
    /// <summary>
    /// Repository (a "Unit of Work" really) of Zza models.
    /// </summary>
    public class ZzaRepository
    {
        private readonly EFContextProvider<ZzaContext> _contextProvider;

        public ZzaRepository()
        {
            _contextProvider = new EFContextProvider<ZzaContext>();
            _contextProvider.BeforeSaveEntityDelegate += EntitySaveGuard;
            StoreId = Guid.Empty;
        }

        private ZzaContext Context { get { return _contextProvider.Context; } }

        public string Metadata
        {
            get {return _contextProvider.Metadata();}
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

        public string Reset(string options)
        {
            // If full reset, delete all additions to the database
            // else delete additions made during this user's session
            var where = options.Contains("fullreset")
                ? "IS NOT NULL"
                : ("= '" + StoreId + "'");

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

        /// <summary>
        /// The current user's StoreId, typically set by the controller
        /// </summary>
        public Guid StoreId { get; set; }

        private IQueryable<T> ForCurrentUser<T>(IQueryable<T> query) where T : class, ISaveable
        {
            return query.Where(x => x.StoreId == null || x.StoreId == StoreId);
        }

        #region Save guard logic

        /// <summary>
        /// True if can save this entity else throw exception
        /// </summary>
        /// <exception cref="System.InvalidOperationException"></exception>
        private bool EntitySaveGuard(EntityInfo arg)
        {
            var typeName = arg.Entity.GetType().Name;
            var saveError = string.Empty;
            var saveable = arg.Entity as ISaveable;

            if (StoreId == Guid.Empty) {
                saveError = "you are not authorized to save.";

            } else if (saveable == null) {
                saveError = "changes to '" + typeName + "' are forbidden.";

            } else {
                switch (arg.EntityState)
                {
                    case EntityState.Added:
                        saveable.StoreId = StoreId;
                        arg.OriginalValuesMap.Add("StoreId", StoreId);
                        break;
                    case EntityState.Modified:
                    case EntityState.Deleted:
                        saveError = canSaveExistingEntity(arg);
                        break;
                    default:
                        var stateName = Enum.GetName(typeof (EntityState), arg.EntityState);
                        saveError = " unexpected EntityState of " + stateName;
                        break;
                }
            }

            if (saveError != null)
            {
                throw new InvalidOperationException(
                    "'" + arg.Entity.GetType().Name + "' may not be saved because " +
                    saveError);
            }
            return true;
        }

        /// <summary>
        /// DbContext for reading entities from the database during validations
        /// </summary>
        /// <remarks>
        /// Can't use the same context for reading and writing.
        /// Lazy instantiated because only used in a few cases.
        /// </remarks>
        private ZzaContext readContext
        {
            get { return _readContext ?? (_readContext = new ZzaContext()); }
        }

        private ZzaContext _readContext;

        #region Type-specific Entity Save Guards

        private string canSaveExistingEntity(EntityInfo arg)
        {
            var type = arg.Entity.GetType();
            if (type == typeof (Customer))
            {
                return ExistingCustomerSaveGuard(arg);
            }
            if (type == typeof (Order))
            {
                return ExistingOrderSaveGuard(arg);
            }
            if (type == typeof (OrderItem))
            {
                return ExistingOrderItemSaveGuard(arg);
            }
            if (type == typeof (OrderItemOption))
            {
                return ExistingOrderItemOptionSaveGuard(arg);
            }

            return "is not a saveable type";
        }

        private string ExistingEntityGuard(ISaveable entity, object id)
        {
            if (entity == null)
            {
                return "the record with key " + id + " was not found.";
            }

            var storeId = entity.StoreId;
            if (storeId == null || storeId == Guid.Empty)
            {
                return "changes to an original record may not be saved.";
            }
            if (StoreId != storeId)
            {
                return "you may only change records created within your own user session.";
            }
            return null; // ok so far
        }

        private string ExistingCustomerSaveGuard(EntityInfo arg)
        {
            var entity = (Customer) arg.Entity;
            var orig = readContext.Customers.SingleOrDefault(e => e.Id == entity.Id);
            return ExistingEntityGuard(orig, entity.Id);
        }

        private string ExistingOrderSaveGuard(EntityInfo arg)
        {
            var entity = (Order) arg.Entity;
            var orig = readContext.Orders.SingleOrDefault(e => e.Id == entity.Id);
            return ExistingEntityGuard(orig, entity.Id);
        }

        private string ExistingOrderItemSaveGuard(EntityInfo arg)
        {
            var entity = (OrderItem) arg.Entity;
            var orig = readContext.OrderItems
                                  .SingleOrDefault(e => e.Id == entity.Id &&
                                                        e.Id == entity.Id);
            var key = "(" + entity.Id + "," + entity.Id + ")";
            return ExistingEntityGuard(orig, key);
        }

        private string ExistingOrderItemOptionSaveGuard(EntityInfo arg)
        {
            var entity = (OrderItemOption) arg.Entity;
            var orig = readContext.OrderItemOptions.SingleOrDefault(e => e.Id == entity.Id);
            return ExistingEntityGuard(orig, entity.Id);
        }

        #endregion

    }

    #endregion

}
