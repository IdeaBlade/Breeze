using System;
using System.Data.Entity;
using System.Linq;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using Northwind.Models;

namespace DocCode.DataAccess
{
    /// <summary>
    /// Repository (a "Unit of Work" really) of Northwind models.
    /// </summary>
    public class NorthwindRepository
    {
        private readonly EFContextProvider<NorthwindContext> _contextProvider;

        public NorthwindRepository()
        {
            _contextProvider = new EFContextProvider<NorthwindContext>();
            _contextProvider.BeforeSaveEntityDelegate += EntitySaveGuard;
        }

        public string Metadata
        {
            get
            {
                // Returns metadata from a dedicated DbContext that is different from
                // the DbContext used for other operations
                // See NorthwindMetadataContext for more about the scenario behind this.
                var metaContextProvider = new EFContextProvider<NorthwindMetadataContext>();
                return metaContextProvider.Metadata();
            }
        }

        public SaveResult SaveChanges(JObject saveBundle)
        {
            return _contextProvider.SaveChanges(saveBundle);
        }

        public IQueryable<Customer> Customers
        {
            get { return ForCurrentUser(Context.Customers); }
        }

        public IQueryable<Customer> CustomersAndOrders
        {
            get { return ForCurrentUser(Context.Customers).Include("Orders"); }
        }

        public IQueryable<Order> OrdersForProduct(int productID = 0)
        {
            var query = ForCurrentUser(Context.Orders);

            query = query.Include("Customer").Include("OrderDetails");
            
            return (productID == 0)
                        ? query
                        : query.Where(o => o.OrderDetails.Any(od => od.ProductID == productID));
        }

        public IQueryable<Customer> CustomersStartingWithA
        {
            get
            {
                return ForCurrentUser(Context.Customers)
                    .Where(c => c.CompanyName.StartsWith("A"));
            }
        }

        public IQueryable<Order> Orders
        {
            get { return ForCurrentUser(Context.Orders); }
        }

        public IQueryable<Order> OrdersAndCustomers
        {
            get { return ForCurrentUser(Context.Orders).Include("Customer"); }
        }

        public IQueryable<Order> OrdersAndDetails
        {
            get { return ForCurrentUser(Context.Orders).Include("OrderDetails"); }
        }

        public IQueryable<Employee> Employees
        {
            get { return ForCurrentUser(Context.Employees); }
        }

        public IQueryable<OrderDetail> OrderDetails
        {
            get { return ForCurrentUser(Context.OrderDetails); }
        }

        public IQueryable<Product> Products
        {
            get { return Context.Products; }
        }

        public IQueryable<Category> Categories
        {
            get { return Context.Categories; }
        }

        public IQueryable<Region> Regions
        {
            get { return Context.Regions; }
        }

        public IQueryable<Territory> Territories
        {
            get { return Context.Territories; }
        }
 
        // Demonstrate a "View Entity" a selection of "safe" entity properties
        // UserPartial is not in Metadata and won't be client cached unless
        // you define metadata for it on the Breeze client
        public IQueryable<UserPartial> UserPartials
        {
            get
            {
                return ForCurrentUser(Context.Users)                  
                              .Select(u => new UserPartial
                                  {
                                      Id = u.Id,
                                      UserName = u.UserName,
                                      FirstName = u.FirstName,
                                      LastName = u.LastName
                                      // Even though this works, sending every user's roles seems unwise
                                      // Roles = user.UserRoles.Select(ur => ur.Role)
                                  });
            }
        }

        // Useful when need ONE user and its roles
        // Could further restrict to the authenticated user
        public UserPartial GetUserById(int id)
        {
            return ForCurrentUser(Context.Users) 
                .Where(u => u.Id == id )
                .Select(u => new UserPartial
                {
                    Id = u.Id,
                    UserName = u.UserName,
                    FirstName = u.FirstName,
                    LastName = u.LastName,
                    Email = u.Email,
                    Roles = u.UserRoles.Select(ur => ur.Role)
                })
                .FirstOrDefault();
        }

        public string Reset(string options)
        {
            // If full reset, delete all additions to the database
            // else delete additions made during this user's session
            var where = options.Contains("fullreset")
                ? "IS NOT NULL"
                : ("= '" + UserSessionId + "'");

            string deleteSql;         
            deleteSql = "DELETE FROM [CUSTOMER] WHERE [USERSESSIONID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [EMPLOYEE] WHERE [USERSESSIONID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [ORDERDETAIL] WHERE [USERSESSIONID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [INTERNATIONALORDER] WHERE [USERSESSIONID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [ORDER] WHERE [USERSESSIONID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [USER] WHERE [USERSESSIONID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            return "reset";
        }

        private NorthwindContext Context { get { return _contextProvider.Context; } }

        /// <summary>
        /// The current user's UserSessionId, typically set by the controller
        /// </summary>
        /// <remarks>
        /// If requested, it must exist and be a non-Empty Guid
        /// </remarks>
        public Guid UserSessionId
        {
            get
            {
                if (_userSessionId == Guid.Empty)
                {
                    throw new InvalidOperationException("Invalid UserSessionId");
                }
                return _userSessionId;
            }
            set { _userSessionId = value; }
        }
        private Guid _userSessionId;

        private IQueryable<T> ForCurrentUser<T>(IQueryable<T> query) where T : class, ISaveable
        {
            return query.Where(x => x.UserSessionId == null || x.UserSessionId == UserSessionId);
        }

        /// <summary>
        /// True if can save this entity else throw exception
        /// </summary>
        /// <exception cref="System.InvalidOperationException"></exception>
        private bool EntitySaveGuard(EntityInfo arg)
        {
            var typeName = arg.Entity.GetType().Name;
            string saveError;

            var saveable = arg.Entity as ISaveable;
            if (saveable == null) {
                saveError = "changes to '" + typeName + "' are forbidden.";
            } else {
                switch (arg.EntityState) {
                    case EntityState.Added:
                        saveError = saveable.canAdd();
                        saveable.UserSessionId = UserSessionId;
                        arg.OriginalValuesMap.Add("UserSessionId", UserSessionId);
                        break;
                    case EntityState.Modified:
                    case EntityState.Deleted:
                        saveError = canSaveExistingEntity(arg);
                        break;
                    default: 
                        var stateName = Enum.GetName(typeof(EntityState), arg.EntityState);
                        saveError = " unexpected EntityState of " + stateName;
                        break;
                }
            }

            if (saveError != null) {
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
        private NorthwindContext readContext
        {
            get { return _readContext ?? (_readContext = new NorthwindContext()); }
        }
        private NorthwindContext _readContext;

        #region Type-specific Entity Save Guards

        private string canSaveExistingEntity(EntityInfo arg)
        {
            var type = arg.Entity.GetType();
            if (type == typeof (Customer)) {
                return ExistingCustomerSaveGuard(arg);
            }
            if (type == typeof(Employee))
            {
                return ExistingEmployeeSaveGuard(arg);
            }
            if (type == typeof(Order))
            {
                return ExistingOrderSaveGuard(arg);
            }
            if (type == typeof(OrderDetail))
            {
                return ExistingOrderDetailSaveGuard(arg);
            }
            if (type == typeof(InternationalOrder))
            {
                return ExistingInternationalOrderSaveGuard(arg);
            }
            if (type == typeof(User))
            {
                return ExistingUserSaveGuard(arg);
            }
            return "is is not a saveable type";
        }

        private string ExistingEntityGuard(ISaveable entity, object id)
        {
            if (entity == null)
            {
                return "the record with key " + id + " was not found.";
            }

            var userSessionId = entity.UserSessionId;
            if (userSessionId == null || userSessionId == Guid.Empty)
            {
                return "changes to an original record may not be saved.";
            }
            if (userSessionId != UserSessionId)
            {
                return "you may only change records created within your own user session.";
            }
            return null; // ok so far
        }

        private string ExistingCustomerSaveGuard(EntityInfo arg)
        {
            var entity = (Customer) arg.Entity;
            var orig = readContext.Customers.SingleOrDefault(e => e.CustomerID == entity.CustomerID);
            return ExistingEntityGuard(orig, entity.CustomerID);
        }

        private string ExistingEmployeeSaveGuard(EntityInfo arg)
        {
            var entity = (Employee) arg.Entity;
            var orig = readContext.Employees.SingleOrDefault(e => e.EmployeeID == entity.EmployeeID);
            return ExistingEntityGuard(orig, entity.EmployeeID);
        }

        private string ExistingOrderSaveGuard(EntityInfo arg)
        {
            var entity = (Order) arg.Entity;
            var orig = readContext.Orders.SingleOrDefault(e => e.OrderID == entity.OrderID);
            return ExistingEntityGuard(orig, entity.OrderID);
        }

        private string ExistingOrderDetailSaveGuard(EntityInfo arg)
        {
            var entity = (OrderDetail) arg.Entity;
            var orig = readContext.OrderDetails
                                  .SingleOrDefault(e => e.OrderID == entity.OrderID &&
                                                        e.ProductID == entity.ProductID);
            var key = "(" + entity.OrderID + "," + entity.ProductID + ")";
            return ExistingEntityGuard(orig, key);
        }

        private string ExistingInternationalOrderSaveGuard(EntityInfo arg)
        {
            var entity = (InternationalOrder) arg.Entity;
            var orig = readContext.InternationalOrders.SingleOrDefault(e => e.OrderID == entity.OrderID);
            return ExistingEntityGuard(orig, entity.OrderID);
        }

        private string ExistingUserSaveGuard(EntityInfo arg)
        {
            var entity = (User) arg.Entity;
            var orig = readContext.Users.SingleOrDefault(e => e.Id == entity.Id);
            return ExistingEntityGuard(orig, entity.Id);
        }

        #endregion


    }
}