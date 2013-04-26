using Breeze.Nhibernate.NorthwindIBModel;
using Breeze.Nhibernate.WebApi;
using Breeze.WebApi;
using log4net;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Linq;
using System.Web.Http;

namespace Breeze.Nhibernate.Northwind
{
    [BreezeController]
    public class NorthwindController : ApiController
    {
        private NorthwindContext context;
        private ILog logger;

        public NorthwindController()
        {
            logger = log4net.LogManager.GetLogger("NorthwindController");
            logger.Info("NorthwindController ctor");
            var session = NorthwindConfig.OpenSession();
            context = new NorthwindContext(session, NorthwindConfig.Configuration);
        }

        [HttpGet]
        public String Metadata()
        {
            var jsonMetadata = context.Metadata();
            return jsonMetadata;
        }

        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return context.SaveChanges(saveBundle);
        }

        [HttpGet]
        public object Lookups()
        {
            var x = new 
            {
                Categories = context.Categories.ToList(),
                Regions = context.Regions.ToList(),
                Roles = context.Roles.ToList(),
            };

            ConfigureJsonFormatter("Categories", "Regions", "Roles");
            return x;
        }

        [HttpGet]
        [BreezeNHQueryable]
        public IQueryable<Customer> Customers()
        {
            return context.Customers;
        }

        [HttpGet]
        [BreezeNHQueryable]
        public IQueryable<Employee> Employees()
        {
            return context.Employees;
        }

        [HttpGet]
        [BreezeNHQueryable]
        public IQueryable<Order> Orders()
        {
            return context.Orders;
        }

        [HttpGet]
        [BreezeNHQueryable]
        public IQueryable<Product> Products()
        {
            return context.Products;
        }

        [HttpGet]
        [BreezeNHQueryable]
        public IQueryable<Supplier> Suppliers()
        {
            return context.Suppliers;
        }

        /// <summary>
        /// Configure the JsonFormatter to serialize only the included properties.
        /// Otherwise NHibernate wants to lazy-load everything.
        /// </summary>
        private void ConfigureJsonFormatter(params string[] includedProperties)
        {
            var jsonFormatter = Configuration.Formatters.JsonFormatter;
            var settings = jsonFormatter.SerializerSettings;
            settings.Formatting = Formatting.Indented;
            settings.ContractResolver = new IncludingContractResolver(includedProperties);
            //settings.Error = delegate(object sender, Newtonsoft.Json.Serialization.ErrorEventArgs args)
            //{
            //    logger.Error(args.ErrorContext.Error.Message);
            //    args.ErrorContext.Handled = true;
            //};
        }



    }


}