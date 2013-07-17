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
        public NorthwindRepository()
        {
            _contextProvider = new EFContextProvider<NorthwindContext>();
            _entitySaveGuard = new NorthwindEntitySaveGuard();
            _contextProvider.BeforeSaveEntityDelegate += _entitySaveGuard.BeforeSaveEntity;
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

        public IQueryable<Supplier> Suppliers
        {
            get { return Context.Suppliers; }
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
            get { return _userSessionId; }
            set {
                _userSessionId = (value == Guid.Empty) ? _guestUserSessionId : value;
            }
        }
        private Guid _userSessionId = _guestUserSessionId;

        private IQueryable<T> ForCurrentUser<T>(IQueryable<T> query) where T : class, ISaveable
        {
            return query.Where(x => x.UserSessionId == null || x.UserSessionId == UserSessionId);
        }

        private readonly EFContextProvider<NorthwindContext> _contextProvider;
        private readonly NorthwindEntitySaveGuard _entitySaveGuard;

        private const string _guestUserSessionIdName = "12345678-9ABC-DEF0-1234-56789ABCDEF0";
        private static readonly Guid _guestUserSessionId = new Guid(_guestUserSessionIdName);

    }
}