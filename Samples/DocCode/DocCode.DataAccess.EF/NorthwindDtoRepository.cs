using System;
using System.Data.Entity;
using System.Linq;

using Breeze.ContextProvider;
using Breeze.ContextProvider.EF6;
using Newtonsoft.Json.Linq;
using Northwind.DtoModels;

namespace DocCode.DataAccess
{
    /// <summary>
    /// Repository (a "Unit of Work" really) of NorthwindDto models.
    /// </summary>
    public class NorthwindDtoRepository
    {
        public NorthwindDtoRepository()
        {
            // for the server-model "real" Northwind DbContext
            _contextProvider = new EFContextProvider<Northwind.Models.NorthwindContext>();
            _entitySaveGuard = new NorthwindEntitySaveGuard();
            _contextProvider.BeforeSaveEntityDelegate += _entitySaveGuard.BeforeSaveEntity;
        }

        public string Metadata
        {
            get
            {
                return new EFContextProvider<NorthwindDtoContext>().Metadata();
            }
        }

        public SaveResult SaveChanges(JObject saveBundle)
        {
            // Todo: transform entities in saveBundle from DTO form into server-model form.
            // At least change the namespace from Northwind.DtoModels to Northwind.Models :-)
            // will fail until then

            // save with server model's "real" contextProvider
            return _contextProvider.SaveChanges(saveBundle);
        }

        public IQueryable<Customer> Customers
        {
            get { return ForCurrentUser(Context.Customers).Select(c => new Customer {
                    CustomerID = c.CustomerID,
                    CompanyName = c.CompanyName,
                    OrderCount = c.Orders.Count()
                });
            }
        }

        public Customer CustomerById(Guid id)
        {
            var cust = 
                ForCurrentUser(Context.Customers)
                    .Where(c =>c.CustomerID == id)
                    .Select(c => new Customer {
                        CustomerID = c.CustomerID,
                        CompanyName = c.CompanyName,
                        OrderCount = c.Orders.Count()})
                    .SingleOrDefault();
               
            // Super secret proprietary calculation. Do not disclose to client!
            cust.FragusIndex = new Random().Next(100);
            return cust;
        }

        // Get Orders and their OrderDetails
        public IQueryable<Order> Orders
        {
            get { return ForCurrentUser(Context.Orders).Select(o => new Order {
                    OrderID = o.OrderID,
                    CustomerID = o.CustomerID,
                    CustomerName = o.Customer.CompanyName,
                    OrderDate = o.OrderDate,
                    RequiredDate = o.RequiredDate,
                    ShippedDate = o.ShippedDate,
                    Freight = o.Freight,
                    RowVersion = o.RowVersion,

                    OrderDetails = o.OrderDetails.Select(od => new OrderDetail
                    {
                        OrderID = od.OrderID,
                        ProductID = od.ProductID, 
                        UnitPrice = od.UnitPrice,
                        Quantity = od.Quantity,
                        Discount = od.Discount,
                        RowVersion = od.RowVersion
                     }).ToList()

                });
            }
        }

        public IQueryable<Product> Products
        {
            get { return Context.Products.Select(p => new Product {
                ProductID = p.ProductID,
                ProductName = p.ProductName
                });
            } 
        }

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

        private IQueryable<T> ForCurrentUser<T>(IQueryable<T> query) 
            where T : class, Northwind.Models.ISaveable
        {
            return query.Where(x => x.UserSessionId == null || x.UserSessionId == UserSessionId);
        }

        private Northwind.Models.NorthwindContext Context { 
            get { return _contextProvider.Context; } 
        }

        private readonly EFContextProvider<Northwind.Models.NorthwindContext> _contextProvider;

        private readonly NorthwindEntitySaveGuard _entitySaveGuard;

        private const string _guestUserSessionIdName = "12345678-9ABC-DEF0-1234-56789ABCDEF0";
        private static readonly Guid _guestUserSessionId = new Guid(_guestUserSessionIdName);

    }
}