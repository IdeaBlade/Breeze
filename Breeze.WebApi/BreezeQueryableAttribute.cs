using System;
using System.Collections;
using System.Linq;
using System.Net.Http;
using System.Web.Http;
using System.Web.Http.Filters;
using System.Web.Http.OData.Query;

namespace Breeze.WebApi {

  /// <summary>
  /// Used to parse and interpret OData like semantics on top of WebApi.
  /// </summary>
  /// <remarks>
  /// Remember to add it to the Filters for your configuration.  Automatically added to each IQueryable method when 
  /// you put the [BreezeController] attribute on an ApiController class.
  /// </remarks>
  [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
  public class BreezeQueryableAttribute : QueryableAttribute {

    private static string QUERY_HELPER_KEY = "BreezeQueryableAttribute_QUERY_HELPER_KEY";

    public BreezeQueryableAttribute() {
      // because QueryableAttribute does not support Expand and Select, but Breeze does.
      this.AllowedQueryOptions = AllowedQueryOptions.Supported | AllowedQueryOptions.Expand | AllowedQueryOptions.Select;
    }

    public override void OnActionExecuting(System.Web.Http.Controllers.HttpActionContext actionContext) {
      base.OnActionExecuting(actionContext);
    }

    /// <summary>
    /// Get the QueryHelper instance for the current request.  We use a single instance per request because
    /// QueryHelper is stateful, and may preserve state between the ApplyQuery and OnActionExecuted methods.
    /// </summary>
    /// <param name="request"></param>
    /// <returns></returns>
    protected QueryHelper GetQueryHelper(HttpRequestMessage request) {
        object qh;
        if (!request.Properties.TryGetValue(QUERY_HELPER_KEY, out qh))
        {
            qh = NewQueryHelper();
            request.Properties.Add(QUERY_HELPER_KEY, qh);
        }
        return (QueryHelper)qh;
    }

    protected virtual QueryHelper NewQueryHelper()
    {
        return new QueryHelper(GetODataQuerySettings());
    }

    public ODataQuerySettings GetODataQuerySettings()
    {
        var settings = new ODataQuerySettings()
        {
            EnableConstantParameterization = this.EnableConstantParameterization,
            EnsureStableOrdering = this.EnsureStableOrdering,
            HandleNullPropagation = this.HandleNullPropagation,
            PageSize = this.PageSize > 0 ? this.PageSize : (int?) null
        };
        return settings;
    }

    /// <summary>
    /// Called when the action is executed.  If the return type is IEnumerable or IQueryable, 
    /// calls OnActionExecuted in the base class, which in turn calls ApplyQuery.
    /// </summary>
    /// <param name="actionExecutedContext">The action executed context.</param>
    public override void OnActionExecuted(HttpActionExecutedContext actionExecutedContext) {

      var response = actionExecutedContext.Response;
      if (response == null || !response.IsSuccessStatusCode) {
        return;
      }

      object responseObject;
      if (!response.TryGetContentValue(out responseObject)) {
        return;
      }

      var request = actionExecutedContext.Request;
      var returnType = actionExecutedContext.ActionContext.ActionDescriptor.ReturnType;
      var queryHelper = GetQueryHelper(request);
      if (typeof(IEnumerable).IsAssignableFrom(returnType))
      {
          // QueryableAttribute only applies for IQueryable and IEnumerable return types
          base.OnActionExecuted(actionExecutedContext);
          if (!response.TryGetContentValue(out responseObject)) {
              return;
          }
          var queryResult = queryHelper.ApplySelectAndExpand(responseObject as IQueryable, request.RequestUri.ParseQueryString());
          queryHelper.WrapResult(request, response, queryResult);
      }
      else
      {
          // We may still need to execute the query and wrap the results.
          if (responseObject is IEnumerable)
          {
              queryHelper.WrapResult(request, response, responseObject);
          }
      }

      var jsonFormatter = actionExecutedContext.Request.GetConfiguration().Formatters.JsonFormatter;
      queryHelper.ConfigureFormatter(jsonFormatter, responseObject as IQueryable);

    }



    /// <summary>
    /// All standard OData web api support is handled here (except select and expand).
    /// This method also handles nested orderby statements the the current ASP.NET web api does not yet support.
    /// This method is called by base.OnActionExecuted
    /// </summary>
    /// <param name="queryable"></param>
    /// <param name="queryOptions"></param>
    /// <returns></returns>
    public override IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions) {

      var queryHelper = GetQueryHelper(queryOptions.Request);

      queryable = queryHelper.BeforeApplyQuery(queryable, queryOptions);
      queryable = queryHelper.ApplyQuery(queryable, queryOptions);
      return queryable;
    }

  }

}


