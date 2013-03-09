using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Formatting;
using System.Web.Http;
using System.Web.Http.Controllers;
using System.Web.Http.Filters;
using System.Web.Http.OData.Query;

namespace Breeze.WebApi {
  /// <summary>
  /// Configure the Web API settings for this Breeze Controller
  /// </summary>
  /// <remarks>
  /// Clears all <see cref="MediaTypeFormatter"/>s and 
  /// adds the Breeze formatter for JSON content.
  /// Removes the competing ASP.NET Web API's QueryFilterProvider if present. 
  /// Adds <see cref="BreezeQueryableFilterProvider"/> for OData query processing
  /// </remarks>
  [AttributeUsage(AttributeTargets.Class)]
  public class BreezeControllerAttribute : Attribute, IControllerConfiguration {

    /// <summary>
    /// Initialize the Breeze controller with a single <see cref="MediaTypeFormatter"/> for JSON
    /// and a single <see cref="IFilterProvider"/> for Breeze OData support
    /// </summary>
    public void Initialize(HttpControllerSettings settings, HttpControllerDescriptor descriptor) {
      lock (__lock) {
        // Remove the Web API's "QueryFilterProvider" 
        // and any previously added BreezeQueryableFilterProvider.
        // Add the value from BreezeFilterProvider()
        // var filterProviders = settings.Services.GetServices(typeof (IFilterProvider));
        
        settings.Services.RemoveAll(typeof(IFilterProvider),
                                    f => (f.GetType().Name == "QueryFilterProvider")
                                         || (f is BreezeQueryableFilterProvider));
        settings.Services.Add(typeof(IFilterProvider), GetFilterProvider());

        // remove all formatters and add only the Breeze JsonFormatter
        settings.Formatters.Clear();
        settings.Formatters.Add(GetJsonFormatter());

      }
    }

    /// <summary>
    /// Return the <see cref="IFilterProvider"/> for a Breeze Controller
    /// </summary>
    /// <remarks>
    /// By default returns an <see cref="BreezeQueryableFilterProvider"/>.
    /// Override to substitute a custom provider.
    /// </remarks>
    protected virtual IFilterProvider GetFilterProvider() {
      return DefaultFilterProvider;
    }

    /// <summary>
    /// Return the Breeze-specific <see cref="MediaTypeFormatter"/> that formats
    /// content to JSON. This formatter must be tailored to work with Breeze clients. 
    /// </summary>
    /// <remarks>
    /// By default returns the Breeze <see cref="JsonFormatter"/>.
    /// Override it to substitute a custom JSON formatter.
    /// </remarks>
    protected virtual MediaTypeFormatter GetJsonFormatter() {
      return DefaultJsonFormatter;
    }

    /// <summary>
    /// A <see cref="IFilterProvider"/> that delivers the Breeze
    /// <see cref="ODataActionFilter"/> to controller action methods 
    /// that return IQueryable.
    /// </summary>
    public class BreezeQueryableFilterProvider : IFilterProvider {
      private readonly IFilter _filter = new BreezeQueryableAttribute() {AllowedQueryOptions = AllowedQueryOptions.All };

      
      public IEnumerable<FilterInfo> GetFilters(HttpConfiguration configuration, HttpActionDescriptor actionDescriptor) {
        if (actionDescriptor == null ||
          (!IsIQueryable(actionDescriptor.ReturnType)) ||
          actionDescriptor.GetCustomAttributes<QueryableAttribute>().Any() || // if method already has a QueryableAttribute (or subclass) then skip it.
          actionDescriptor.GetParameters().Any(parameter => typeof (ODataQueryOptions).IsAssignableFrom(parameter.ParameterType))
        ) {
          return Enumerable.Empty<FilterInfo>();
        }

        return new FilterInfo[] { new FilterInfo(_filter, FilterScope.Global) };
      }

      internal static bool IsIQueryable(Type type) {
        if (type == typeof(IQueryable)) return true;
        if (type != null && type.IsGenericType) {
          return type.GetGenericTypeDefinition() == typeof(IQueryable<>);
        }
        return false;
      }
    }

    private static object __lock = new object();


    // These instances are stateless and threadsafe so can use static versions for all controller instances
    private static readonly IFilterProvider DefaultFilterProvider = new BreezeQueryableFilterProvider();
    private static readonly MediaTypeFormatter DefaultJsonFormatter = JsonFormatter.Create();
  }

}
