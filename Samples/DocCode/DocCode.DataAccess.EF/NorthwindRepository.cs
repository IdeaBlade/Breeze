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
        private readonly EFContextProvider<NorthwindContext>
            _contextProvider = new EFContextProvider<NorthwindContext>();

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
    }
}