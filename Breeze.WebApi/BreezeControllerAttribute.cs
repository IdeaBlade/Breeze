using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Formatting;
using System.Web.Http;
using System.Web.Http.Controllers;
using System.Web.Http.Filters;

namespace Breeze.WebApi
{
    /// <summary>
    /// Configure the Web API settings for this Breeze Controller
    /// </summary>
    /// <remarks>
    /// Clears all <see cref="MediaTypeFormatter"/>s and 
    /// adds the Breeze formatter for JSON content.
    /// Clears all <see cref="IFilterProvider"/>s and
    /// adds the Breeze filter provider for OData query processing
    /// </remarks>
    [AttributeUsage(AttributeTargets.Class)]
    public class BreezeControllerAttribute : Attribute, IControllerConfiguration
    {
        // These instances are stateless and threadsafe so can use static versions for all controller instances
        private static readonly IFilterProvider DefaultBreezeFilterProvider = new ODataActionFilterProvider();
        private static readonly MediaTypeFormatter DefaultBreezeJsonFormatter = JsonFormatter.Create();

        /// <summary>
        /// Initialize the Breeze controller with a single <see cref="MediaTypeFormatter"/> for JSON
        /// and a single <see cref="IFilterProvider"/> for Breeze OData support
        /// </summary>
        public void Initialize(HttpControllerSettings settings, HttpControllerDescriptor descriptor)
        {
            // replace the Web API's QueryActionFilterProvider with Breeze ODataActionFilter
            settings.Services.Replace(typeof(IFilterProvider), BreezeFilterProvider());

            // remove all formatters and add only the Breeze JsonFormatter
            settings.Formatters.Clear();
            settings.Formatters.Add(BreezeJsonFormatter());
        }

        /// <summary>
        /// Return the <see cref="IFilterProvider"/> for a Breeze Controller
        /// </summary>
        /// <remarks>
        /// By default returns an <see cref="ODataActionFilterProvider"/>.
        /// Override to substitute a custom provider.
        /// </remarks>
        protected virtual IFilterProvider BreezeFilterProvider()
        {
            return DefaultBreezeFilterProvider;
        }

        /// <summary>
        /// Return the Breeze-specific <see cref="MediaTypeFormatter"/> that formats
        /// content to JSON. This formatter must be tailored to work with Breeze clients. 
        /// </summary>
        /// <remarks>
        /// By default returns the Breeze <see cref="JsonFormatter"/>.
        /// Override it to substitute a custom JSON formatter.
        /// </remarks>
        protected virtual MediaTypeFormatter BreezeJsonFormatter()
        {
            return DefaultBreezeJsonFormatter;
        }

        /// <summary>
        /// A <see cref="IFilterProvider"/> that delivers the Breeze
        /// <see cref="ODataActionFilter"/> to controller action methods 
        /// that return IQueryable.
        /// </summary>
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
