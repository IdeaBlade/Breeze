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
        settings.Services.RemoveAll(typeof(IFilterProvider),
                                    f => (f.GetType().Name == "QueryFilterProvider")
                                         || (f is BreezeQueryableFilterProvider));
        settings.Services.Add(typeof(IFilterProvider), GetFilterProvider(_filter));

        // remove all formatters and add only the Breeze JsonFormatter
        settings.Formatters.Clear();
        settings.Formatters.Add(GetJsonFormatter());

      }
    }

    /// <summary>
    /// Gets or sets a value indicating whether query composition should
    /// alter the original query when necessary to ensure a stable sort order.
    /// </summary>
    /// <value>A <c>true</c> value indicates the original query should
    /// be modified when necessary to guarantee a stable sort order.
    /// A <c>false</c> value indicates the sort order can be considered
    /// stable without modifying the query.  Query providers that ensure
    /// a stable sort order should set this value to <c>false</c>.
    /// The default value is <c>true</c>.</value>
    public bool EnsureStableOrdering {
      get { return _filter.EnsureStableOrdering; }
      set { _filter.EnsureStableOrdering = value; }
    }

    /// <summary>
    /// Gets or sets a value indicating how null propagation should
    /// be handled during query composition. 
    /// </summary>
    /// <value>
    /// The default is <see cref="HandleNullPropagationOption.Default"/>.
    /// </value>
    public HandleNullPropagationOption HandleNullPropagation {
      get { return _filter.HandleNullPropagation; }
      set { _filter.HandleNullPropagation = value; }
    }

    /// <summary>
    /// Gets or sets the maximum depth of the Any or All elements nested inside the query.
    /// </summary>
    /// <remarks>
    /// This limit helps prevent Denial of Service attacks. The default value is 1.
    /// </remarks>
    /// <value>
    /// The maxiumum depth of the Any or All elements nested inside the query.
    /// </value>
    public int MaxAnyAllExpressionDepth {
      get { return _filter.MaxAnyAllExpressionDepth; }
      set { _filter.MaxAnyAllExpressionDepth = value; }
    }

    /// <summary>
    /// Gets or sets the maximum number of query results to send back to clients.
    /// </summary>
    /// <value>
    /// The maximum number of query results to send back to clients.
    /// </value>
    public int PageSize {
      get { return _filter.PageSize; }
      set { _filter.PageSize = value; }
    }

    public AllowedQueryOptions AllowedQueryOptions {
      get { return _filter.AllowedQueryOptions; }
      set { _filter.AllowedQueryOptions = value; }
    }

    public AllowedFunctions AllowedFunctions {
      get { return _filter.AllowedFunctions; }
      set { _filter.AllowedFunctions = value; }
    }

    public AllowedArithmeticOperators AllowedArithmeticOperators {
      get { return _filter.AllowedArithmeticOperators; }
      set { _filter.AllowedArithmeticOperators = value; }
    }

    public AllowedLogicalOperators AllowedLogicalOperators {
      get { return _filter.AllowedLogicalOperators; }
      set { _filter.AllowedLogicalOperators = value; }
    }

    public string AllowedOrderByProperties {
      get { return _filter.AllowedOrderByProperties; }
      set { _filter.AllowedOrderByProperties = value; }
    }

    public int MaxSkip {
      get { return _filter.MaxSkip; }
      set { _filter.MaxSkip = value; }
    }

    public int MaxTop {
      get { return _filter.MaxTop; }
      set { _filter.MaxTop = value; }
    }


    /// <summary>
    /// Return the <see cref="IFilterProvider"/> for a Breeze Controller
    /// </summary>
    /// <remarks>
    /// By default returns an <see cref="BreezeQueryableFilterProvider"/>.
    /// Override to substitute a custom provider.
    /// </remarks>
    protected virtual IFilterProvider GetFilterProvider(BreezeQueryableAttribute defaultFilter) {
      return new BreezeQueryableFilterProvider(defaultFilter);
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

    private BreezeQueryableAttribute _filter = new BreezeQueryableAttribute() { AllowedQueryOptions = AllowedQueryOptions.All };
    private static object __lock = new object();


    // These instances are stateless and threadsafe so can use static versions for all controller instances
    private static readonly MediaTypeFormatter DefaultJsonFormatter = JsonFormatter.Create();
  }

  internal class BreezeQueryableFilterProvider : IFilterProvider {
    
    public BreezeQueryableFilterProvider(BreezeQueryableAttribute filter) {
      _filter = filter;
    }

    public IEnumerable<FilterInfo> GetFilters(HttpConfiguration configuration, HttpActionDescriptor actionDescriptor) {
      if (actionDescriptor == null ||
        (!IsIQueryable(actionDescriptor.ReturnType)) ||
        actionDescriptor.GetCustomAttributes<QueryableAttribute>().Any() || // if method already has a QueryableAttribute (or subclass) then skip it.
        actionDescriptor.GetParameters().Any(parameter => typeof(ODataQueryOptions).IsAssignableFrom(parameter.ParameterType))
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

    private IFilter _filter;
  }
}
