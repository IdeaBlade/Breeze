using Breeze.WebApi;
using Breeze.WebApi.NH;
using Models.NorthwindIB.NH;
using NHibernate;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Web.Http;
using System.Net.Http.Formatting;



namespace NorthBreeze.Controllers
{
    public class CriteriaController : ApiController
    {
        private CriteriaContext context;

        protected override void Initialize(System.Web.Http.Controllers.HttpControllerContext controllerContext)
        {
            base.Initialize(controllerContext);
            InitializeJsonFormatter(controllerContext.Configuration.Formatters.JsonFormatter);
            context = new CriteriaContext();
        }

        private void InitializeJsonFormatter(JsonMediaTypeFormatter jsonFormatter)
        {
            var settings = BreezeConfig.Instance.GetJsonSerializerSettings();
            settings.Formatting = Formatting.Indented;  // TODO debug only - makes the payload larger

            settings.Error = delegate(object sender, Newtonsoft.Json.Serialization.ErrorEventArgs args)
            {
                // When the NHibernate session is closed, NH proxies throw LazyInitializationException when
                // the serializer tries to access them.  We want to ignore those exceptions.
                var error = args.ErrorContext.Error;
                if (error is LazyInitializationException || error is ObjectDisposedException)
                    args.ErrorContext.Handled = true;
            };
            settings.Converters.Add(new NHibernateProxyJsonConverter());
            jsonFormatter.SerializerSettings = settings;
        }


        [HttpGet]
        public String Metadata()
        {
            return context.Metadata();
        }

        [HttpPost]
        public SaveResult SaveChanges(JObject saveBundle)
        {
            return context.SaveChanges(saveBundle);
            //var sqlContext = new NorthwindSqlContext();
            //return sqlContext.SaveChanges(saveBundle);
        }

        //[HttpGet]
        //public IList<Customer> Customers(HttpRequestMessage request)
        //{
        //    return context.List<Customer>(request.RequestUri.Query);
        //}

        [HttpGet]
        public QueryResult Customers(HttpRequestMessage request)
        {
            return context.Result<Customer>(request.RequestUri.Query);
        }

        [HttpGet]
        public IList<Order> Orders(HttpRequestMessage request)
        {
            return context.List<Order>(request.RequestUri.Query);
        }
    }
}