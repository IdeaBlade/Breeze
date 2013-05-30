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

      dynamic rQuery = null;
      var request = actionExecutedContext.Request;
      var queryHelper = GetQueryHelper(request);
      var queryable = queryHelper.ApplySelectAndExpand(responseObject as IQueryable, request.RequestUri.ParseQueryString());
      if (queryable != null) {
        // if a select or expand was encountered we need to
        // execute the DbQueries here, so that any exceptions thrown can be properly returned.
        // if we wait to have the query executed within the serializer, some exceptions will not
        // serialize properly.
        rQuery = Enumerable.ToList((dynamic) queryable);
      } 

      Object tmp;
      actionExecutedContext.Request.Properties.TryGetValue("MS_InlineCount", out tmp);
      var inlineCount = (Int64?) tmp;
      
      if (rQuery!=null || inlineCount.HasValue) {
        if (rQuery == null) {
          rQuery = responseObject;
        }
        if (inlineCount.HasValue) {
          rQuery = new QueryResult() { Results = rQuery, InlineCount = inlineCount};
        }
        
        var formatter = ((dynamic) actionExecutedContext.Response.Content).Formatter;
        var oc = new ObjectContent(rQuery.GetType(), rQuery, formatter);
        actionExecutedContext.Response.Content = oc;
      } 

      
    }
    
    // all standard OData web api support is handled here (except select and expand).
    // This method also handles nested orderby statements the the current ASP.NET web api does not yet support.
    // This method is called by base.OnActionExecuted
    public override IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions) {
      IQueryable result;
      var orderBy = queryOptions.RawValues.OrderBy;
      if (orderBy != null && orderBy.IndexOf('/') >= 0) {
          var request = queryOptions.Request;
          var queryHelper = GetQueryHelper(request);
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


