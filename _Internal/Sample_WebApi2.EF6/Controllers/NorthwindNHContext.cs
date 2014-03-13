using Breeze.ContextProvider;
using Breeze.ContextProvider.NH;
using Breeze.WebApi2;
using Models.NorthwindIB.NH;
using System;
using System.Collections.Generic;

namespace Sample_WebApi2.Controllers
{
    public class NorthwindNHContext : NHContext
    {
        public NorthwindNHContext() : base(NorthwindNHConfig.OpenSession()) { }

        public NorthwindNHContext(NHContext sourceContext) : base(sourceContext) { }

        protected override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {
          var meta = this.GetMetadata();
          var bvalidator = new BreezeMetadataValidator(this, meta);
          bvalidator.ValidateEntities(saveMap, true);

          DataAnnotationsValidator.AddDescriptor(typeof(Customer), typeof(CustomerMetaData));
          var validator = new DataAnnotationsValidator(this);
          validator.ValidateEntities(saveMap, true);

          return base.BeforeSaveEntities(saveMap);
        }

        public NorthwindNHContext Context
        {
            get { return this; }
        }
        public NhQueryableInclude<Category> Categories
        {
            get { return GetQuery<Category>(); }
        }
        public NhQueryableInclude<Comment> Comments
        {
            get { return GetQuery<Comment>(); }
        }
        public NhQueryableInclude<Customer> Customers
        {
            get { return GetQuery<Customer>(); }
        }
        public NhQueryableInclude<Employee> Employees
        {
            get { return GetQuery<Employee>(); }
        }
        public NhQueryableInclude<Geospatial> Geospatials
        {
            get { return GetQuery<Geospatial>(); }
        }
        public NhQueryableInclude<Order> Orders
        {
            get { return GetQuery<Order>(); }
        }
        public NhQueryableInclude<OrderDetail> OrderDetails
        {
            get { return GetQuery<OrderDetail>(); }
        }
        public NhQueryableInclude<Product> Products
        {
            get { return GetQuery<Product>(); }
        }
        public NhQueryableInclude<Region> Regions
        {
            get { return GetQuery<Region>(); }
        }
        public NhQueryableInclude<Role> Roles
        {
            get { return GetQuery<Role>(); }
        }
        public NhQueryableInclude<Supplier> Suppliers
        {
            get { return GetQuery<Supplier>(); }
        }
        public NhQueryableInclude<Territory> Territories
        {
            get { return GetQuery<Territory>(); }
        }
        public NhQueryableInclude<TimeGroup> TimeGroups
        {
            get { return GetQuery<TimeGroup>(); }
        }
        public NhQueryableInclude<TimeLimit> TimeLimits
        {
            get { return GetQuery<TimeLimit>(); }
        }
        public NhQueryableInclude<UnusualDate> UnusualDates
        {
            get { return GetQuery<UnusualDate>(); }
        }
        public NhQueryableInclude<User> Users
        {
            get { return GetQuery<User>(); }
        }

    }
}