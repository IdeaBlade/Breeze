using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Formatting;
using System.Web.Http;
using System.Web.Http.Controllers;
using System.Web.Http.Filters;

namespace Breeze.WebApi
{
    public class BreezeControllerAttribute : Attribute, IControllerConfiguration
    {
        // These instances are stateless and threadsafe so can use static versions for all controller instances
        private static readonly ODataActionFilterProvider _filterProvider = new ODataActionFilterProvider();
        private static readonly JsonMediaTypeFormatter _jsonFormatter = JsonFormatter.Create();

        public void Initialize(HttpControllerSettings settings, HttpControllerDescriptor descriptor)
        {
            // replace the Web API's QueryActionFilterProvider with Breeze ODataActionFilter
            settings.Services.Replace(typeof(IFilterProvider), _filterProvider);

            // remove the XML formatter because can't format controller output as XML
            var xmlFormatter = settings.Formatters.XmlFormatter;
            settings.Formatters.Remove(xmlFormatter);

            // replace the global JSON formatter with the Breeze version
            var jsonFormatter = settings.Formatters.JsonFormatter;
            settings.Formatters.Remove(jsonFormatter);
            settings.Formatters.Add(_jsonFormatter);
        }

        public class ODataActionFilterProvider : IFilterProvider
        {
            private readonly IFilter _filter = new ODataActionFilter();

            public IEnumerable<FilterInfo> GetFilters(HttpConfiguration configuration, HttpActionDescriptor actionDescriptor)
            {
                return (actionDescriptor == null || !IsIQueryable(actionDescriptor.ReturnType)) ?
                    Enumerable.Empty<FilterInfo>() :
                    new[] { new FilterInfo(_filter, FilterScope.Global) };
            }

            internal static bool IsIQueryable(Type type)
            {
                if (type == typeof(IQueryable))
                    return true;
                if (type != null && type.IsGenericType)
                    return type.GetGenericTypeDefinition() == typeof(IQueryable<>);
                return false;
            }
        }
    }

}
