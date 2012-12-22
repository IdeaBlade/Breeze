using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Formatting;
using System.Web.Http;
using System.Web.Http.Controllers;
using System.Web.Http.Filters;

namespace Breeze.WebApi {

  [AttributeUsage(AttributeTargets.Class)]
  public class BreezeControllerAttribute : Attribute, IControllerConfiguration {
    // These instances are stateless and threadsafe so can use static versions for all controller instances
    private static readonly ODataActionFilterProvider _filterProvider = new ODataActionFilterProvider();
    private static readonly JsonMediaTypeFormatter _jsonFormatter = JsonFormatter.Create();

    public void Initialize(HttpControllerSettings settings, HttpControllerDescriptor descriptor) {
      // replace the Web API's QueryActionFilterProvider with Breeze ODataActionFilter
      settings.Services.Replace(typeof(IFilterProvider), _filterProvider);

      // remove all formatters and add only the Breeze JsonFormatter
      settings.Formatters.Clear();
      settings.Formatters.Add(_jsonFormatter);
    }

    public class ODataActionFilterProvider : IFilterProvider {
      private readonly IFilter _filter = new ODataActionFilter();

      public IEnumerable<FilterInfo> GetFilters(HttpConfiguration configuration, HttpActionDescriptor actionDescriptor) {
        return (actionDescriptor == null || !IsIQueryable(actionDescriptor.ReturnType)) ?
            Enumerable.Empty<FilterInfo>() :
            new[] { new FilterInfo(_filter, FilterScope.Global) };
      }

      internal static bool IsIQueryable(Type type) {
        if (type == typeof(IQueryable))
          return true;
        if (type != null && type.IsGenericType)
          return type.GetGenericTypeDefinition() == typeof(IQueryable<>);
        return false;
      }
    }
  }

}
