using Breeze.Nhibernate.NorthwindIBModel;
using Breeze.Nhibernate.WebApi;
using NHibernate;
using NHibernate.Cfg;
using System.Linq;


namespace Breeze.Nhibernate.Northwind
{
    public class NorthwindContext : NHContext
    {
        public NorthwindContext(ISession session, Configuration configuration) : base(session, configuration)
        {}

        public IQueryable<Category> Categories
        {
            get { return GetQuery<Category>(); }
        }
        public IQueryable<Customer> Customers
        {
            get { return GetQuery<Customer>(); }
        }
        public IQueryable<Employee> Employees
        {
            get { return GetQuery<Employee>(); }
        }
        public IQueryable<Order> Orders
        {
            get { return GetQuery<Order>(); }
        }
        public IQueryable<Product> Products
        {
            get { return GetQuery<Product>(); }
        }
        public IQueryable<Region> Regions
        {
            get { return GetQuery<Region>(); }
        }
        public IQueryable<Role> Roles
        {
            get { return GetQuery<Role>(); }
        }
        public IQueryable<Supplier> Suppliers
        {
            get { return GetQuery<Supplier>(); }
        }
        public IQueryable<User> Users
        {
            get { return GetQuery<User>(); }
        }


    }
}
