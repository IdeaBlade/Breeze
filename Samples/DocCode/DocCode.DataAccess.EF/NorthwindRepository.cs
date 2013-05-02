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
            _contextProvider.BeforeSaveEntityDelegate += CustomerSaveGuard;
        }

        private NorthwindContext Context { get { return _contextProvider.Context; } }

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
            get { return Context.Customers; }
        }

        public IQueryable<Customer> CustomersAndOrders
        {
            get { return Context.Customers.Include("Orders"); }
        }

        public IQueryable<Order> OrdersForProduct(int productID = 0)
        {
            System.Data.Entity.Infrastructure.DbQuery<Order> query = Context.Orders;
            query = query.Include("Customer").Include("OrderDetails");
            return (productID == 0)
                        ? query
                        : query.Where(o => o.OrderDetails.Any(od => od.ProductID == productID));
        }

        public IQueryable<Customer> CustomersStartingWithA
        {
            get { return Context.Customers.Where(c => c.CompanyName.StartsWith("A")); }
        }

        public IQueryable<Order> Orders
        {
            get { return Context.Orders; }
        }

        public IQueryable<Order> OrdersAndCustomers
        {
            get { return Context.Orders.Include("Customer"); }
        }

        public IQueryable<Order> OrdersAndDetails
        {
            get { return Context.Orders.Include("OrderDetails"); }
        }

        public IQueryable<Employee> Employees
        {
            get { return Context.Employees; }
        }

        public IQueryable<OrderDetail> OrderDetails
        {
            get { return Context.OrderDetails; }
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
                return Context.Users
                              .Select(user => new UserPartial
                                  {
                                      Id = user.Id,
                                      UserName = user.UserName,
                                      FirstName = user.FirstName,
                                      LastName = user.LastName
                                      // Even though this works, sending every user's roles seems unwise
                                      // Roles = user.UserRoles.Select(ur => ur.Role)
                                  });
            }
        }
        // Useful when need ONE user and its roles
        // Could further restrict to the authenticated user
        public UserPartial GetUserById(int id)
        {
            return Context.Users
                .Where(user => user.Id == id)
                .Select(user => new UserPartial
                {
                    Id = user.Id,
                    UserName = user.UserName,
                    FirstName = user.FirstName,
                    LastName = user.LastName,
                    Email = user.Email,
                    Roles = user.UserRoles.Select(ur => ur.Role)
                })
                .FirstOrDefault();
        }

        public string Reset()
        {
            // Delete all additions to the database
            var deleteSql = "DELETE FROM ORDERDETAIL WHERE ORDERID > " + Order.HighestOriginalID;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [ORDER] WHERE ORDERID > " + Order.HighestOriginalID;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM EMPLOYEE WHERE EMPLOYEEID > " + Employee.HighestOriginalID;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM CUSTOMER WHERE CUSTOMERID_OLD IS NULL";
            Context.Database.ExecuteSqlCommand(deleteSql);
            return "reset";
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
            } else switch (arg.EntityState) {
                    case EntityState.Added:
                        saveError = saveable.canAdd();
                        break;
                    case EntityState.Modified:
                        saveError = saveable.canUpdate();
                        break;
                    case EntityState.Deleted:
                        saveError = saveable.canDelete();
                        break;
                    default: 
                        var stateName = System.Enum.GetName(typeof(EntityState), arg.EntityState);
                        saveError = " unexpected EntityState of " + stateName;
                        break;
            }
            if (saveError == null) return true;
            throw new System.InvalidOperationException(
                "'" + arg.Entity.GetType().Name + "' may not be saved because " +
                saveError);
        }
        
        /// <summary>
        /// True if can save Customer else throw exception
        /// </summary>
        /// <exception cref="System.InvalidOperationException"></exception>
        private bool CustomerSaveGuard(EntityInfo arg)
        {
            var cust = arg.Entity as Customer;
            if (cust == null) return true;
            if (arg.EntityState == EntityState.Added) return true;
            var orig = readContext.Customers.SingleOrDefault(c => c.CustomerID == cust.CustomerID);
            if (orig == null) {
                throw new System.InvalidOperationException(
                    "Customer "+cust.CustomerID+" not found.");
            }
            if (orig.CustomerID_OLD == null) return true;
            throw new System.InvalidOperationException(
                "Changes to an original Customer may not be saved." );
        }


        /// <summary>
        /// DbContext for reading entities from the database during validations
        /// </summary>
        /// <remarks>
        /// Can't use the same context for reading and writing.
        /// Lazy instantiated because only used in a few cases.
        /// </remarks>
        private NorthwindContext readContext {
            get {
                if (_readContext == null) {
                    _readContext = new NorthwindContext();
                }
                return _readContext;
            }
        }
        private NorthwindContext _readContext;
    }
}