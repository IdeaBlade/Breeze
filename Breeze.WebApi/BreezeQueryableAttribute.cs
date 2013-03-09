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

    public BreezeQueryableAttribute() {
      // because QueryableAttribute does not support Expand and Select
      this.AllowedQueryOptions = AllowedQueryOptions.Supported | AllowedQueryOptions.Expand | AllowedQueryOptions.Select;
    }

    public override void OnActionExecuting(System.Web.Http.Controllers.HttpActionContext actionContext) {
      base.OnActionExecuting(actionContext);
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

      var queryable = ApplySelectAndExpand(responseObject as IQueryable, actionExecutedContext.Request);
      if (queryable != null) {
        // if a select or expand was encountered we need to
        // execute the DbQueries here, so that any exceptions thrown can be properly returned.
        // if we wait to have the query executed within the serializer, some exceptions will not
        // serialize properly.
        var rQuery = Enumerable.ToList((dynamic) queryable);

        var formatter = ((dynamic) actionExecutedContext.Response.Content).Formatter;
        var oc = new ObjectContent(rQuery.GetType(), rQuery, formatter);
        actionExecutedContext.Response.Content = oc;
      }

      Object tmp;
      actionExecutedContext.Request.Properties.TryGetValue("MS_InlineCount", out tmp);
      var inlineCount = (Int64?) tmp;
      
      if (inlineCount.HasValue) {
        actionExecutedContext.Response.Headers.Add("X-InlineCount", inlineCount.ToString());
      }
      
    }
    
    // all standard OData web api support is handled here ( except select and expand).
    // This method also handles nested orderby statements the the current ASP.NET web api does not yet support.
    public override IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions) {
      IQueryable result;
      try {
        result = base.ApplyQuery(queryable, queryOptions);
      } catch (Exception e) {
        result = ApplyExtendedOrderBy(queryable, queryOptions);
        if (result == null) {
          throw;
        }
      }
      
      return result;
    }

    private IQueryable ApplyExtendedOrderBy(IQueryable queryable, ODataQueryOptions queryOptions) {
      var orderByQueryString = queryOptions.RawValues.OrderBy;
      if (orderByQueryString == null || orderByQueryString.IndexOf("/") == -1) {
        return null;
      }

      var request = queryOptions.Request;
      var oldUri = request.RequestUri;
      var map = oldUri.ParseQueryString();
      var newQuery = map.Keys.Cast<String>()
                        .Where(k => k != "$orderby")
                        .Select(k => k + "=" + map[k])
                        .ToAggregateString("&");

      var newUrl = oldUri.Scheme + "://" + oldUri.Authority + oldUri.AbsolutePath + "?" + newQuery;

      var newRequest = new HttpRequestMessage(request.Method, new Uri(newUrl));
      var newQo = new ODataQueryOptions(queryOptions.Context, newRequest);
      var result = base.ApplyQuery(queryable, newQo);

      var elementType = TypeFns.GetElementType(queryable.GetType());
      
      if (!string.IsNullOrWhiteSpace(orderByQueryString)) {
        var orderByClauses = orderByQueryString.Split(',').ToList();
        var isThenBy = false;
        orderByClauses.ForEach(obc => {
          var func = QueryBuilder.BuildOrderByFunc(isThenBy, elementType, obc);
          result = func(result);
          isThenBy = true;
        });
      }
      request.Properties.Add("breeze_orderBy", true);
      return result;
    }

    public IQueryable ApplySelectAndExpand(IQueryable queryable, HttpRequestMessage request ) {
      var result = queryable;
      var hasSelectOrExpand = false;      

      var map = request.RequestUri.ParseQueryString();

      var selectQueryString = map["$select"];
      if (!string.IsNullOrWhiteSpace(selectQueryString)) {
        var selectClauses = selectQueryString.Split(',').Select(sc => sc.Replace('/', '.')).ToList();
        var elementType = TypeFns.GetElementType(queryable.GetType());
        var func = QueryBuilder.BuildSelectFunc(elementType, selectClauses);
        result = func(result);
        hasSelectOrExpand = true;
      }

      var expandsQueryString = map["$expand"];
      if (!string.IsNullOrWhiteSpace(expandsQueryString)) {
        if (!string.IsNullOrWhiteSpace(selectQueryString)) {
          throw new Exception("Use of both 'expand' and 'select' in the same query is not currently supported");
        }
        expandsQueryString.Split(',').Select(s => s.Trim()).ToList().ForEach(expand => {
          result = ((dynamic) result).Include(expand.Replace('/', '.'));
        });
        hasSelectOrExpand = true;
      }

      return hasSelectOrExpand ? result : null;
      
    }

  }
}


