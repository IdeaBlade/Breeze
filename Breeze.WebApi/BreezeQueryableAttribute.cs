using System;
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
  /// Remember to add it to the Filters for your configuration
  /// </remarks>
  [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
  public class BreezeQueryableAttribute : QueryableAttribute {

      private static string QUERY_HELPER_KEY = "BreezeQueryableAttribute_QUERY_HELPER_KEY";

    public BreezeQueryableAttribute() {
      // because QueryableAttribute does not support Expand and Select
      this.AllowedQueryOptions = AllowedQueryOptions.Supported | AllowedQueryOptions.Expand | AllowedQueryOptions.Select;
    }

    public override void OnActionExecuting(System.Web.Http.Controllers.HttpActionContext actionContext) {
      base.OnActionExecuting(actionContext);
    }

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
        return new QueryHelper(EnableConstantParameterization, EnsureStableOrdering, HandleNullPropagation, PageSize);
    }

    /// <summary>
    /// Called when the action is executed.
    /// </summary>
    /// <param name="actionExecutedContext">The action executed context.</param>
    public override void OnActionExecuted(HttpActionExecutedContext actionExecutedContext) {

      base.OnActionExecuted(actionExecutedContext);
      
      if (!actionExecutedContext.Response.IsSuccessStatusCode) {
        return;
      }

      object responseObject;
      if (!actionExecutedContext.Response.TryGetContentValue(out responseObject)) {
        return;
      }

      var request = actionExecutedContext.Request;
      var queryHelper = GetQueryHelper(request);
      var queryResult = queryHelper.ApplySelectAndExpand(responseObject as IQueryable, request.RequestUri.ParseQueryString());

      queryHelper.WrapResult(actionExecutedContext.Request, actionExecutedContext.Response, responseObject, queryResult);
    }


    
    // all standard OData web api support is handled here (except select and expand).
    // This method also handles nested orderby statements the the current ASP.NET web api does not yet support.
    // This method is called by base.OnActionExecuted
    public override IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions) {
      var request = queryOptions.Request;
      var queryHelper = GetQueryHelper(request);
      queryHelper.BeforeApplyQuery(queryable, queryOptions);

      IQueryable result;
      var orderBy = queryOptions.RawValues.OrderBy;
      if (orderBy != null && orderBy.IndexOf('/') >= 0) {
          result = queryHelper.ApplyExtendedOrderBy(queryable, queryOptions);
          if (result != null)
          {
              request.Properties.Add("breeze_orderBy", true);
          }
      }
      else {
          result = base.ApplyQuery(queryable, queryOptions);
      }

      return result;
    }


  }

  public class QueryResult {
    public dynamic Results { get; set; }
    public Int64? InlineCount { get; set; }
  }
}


