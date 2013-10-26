using System;
using System.Collections;
using System.Collections.Specialized;
using System.Linq;
using System.Linq.Expressions;
using System.Net.Http;
using System.Net.Http.Formatting;
using System.Reflection;
using System.Web.Http.OData.Query;

using Breeze.ContextProvider;
using System.Collections.Generic;

namespace Breeze.WebApi2 {
  public class QueryHelper {
    protected ODataQuerySettings querySettings;

    public QueryHelper(ODataQuerySettings querySettings) {
      this.querySettings = querySettings;
    }

    public QueryHelper(bool enableConstantParameterization, bool ensureStableOrdering, HandleNullPropagationOption handleNullPropagation, int? pageSize) {
      this.querySettings = NewODataQuerySettings(enableConstantParameterization, ensureStableOrdering, handleNullPropagation, pageSize);
    }

    public QueryHelper()
      : this(true, true, HandleNullPropagationOption.False, null) {
    }

    public static ODataQuerySettings NewODataQuerySettings(bool enableConstantParameterization, bool ensureStableOrdering, HandleNullPropagationOption handleNullPropagation, int? pageSize) {
      var settings = new ODataQuerySettings() {
        EnableConstantParameterization = enableConstantParameterization,
        EnsureStableOrdering = ensureStableOrdering,
        HandleNullPropagation = handleNullPropagation,
        PageSize = pageSize > 0 ? pageSize : null
      };
      return settings;
    }

    /// <summary>returns a copy of queryOptions with $orderby, $top, and $skip removed.</summary>
    public static ODataQueryOptions RemoveExtendedOps(ODataQueryOptions queryOptions) {
      var request = queryOptions.Request;
      var oldUri = request.RequestUri;

      var map = oldUri.ParseQueryString();
      var newQuery = map.Keys.Cast<String>()
                        .Where(k => (k.Trim().Length > 0) && (k != "$orderby") && (k != "$top") && (k != "$skip"))
                        .Select(k => k + "=" + map[k])
                        .ToAggregateString("&");

      var newUrl = oldUri.Scheme + "://" + oldUri.Authority + oldUri.AbsolutePath + "?" + newQuery;
      var newUri = new Uri(newUrl);

      var newRequest = new HttpRequestMessage(request.Method, newUri);
      var newQo = new ODataQueryOptions(queryOptions.Context, newRequest);
      return newQo;
    }

    public static ODataQueryOptions RemoveSelectAndExpand(ODataQueryOptions queryOptions) {
      var request = queryOptions.Request;
      var oldUri = request.RequestUri;

      var map = oldUri.ParseQueryString();
      var newQuery = map.Keys.Cast<String>()
                        .Where(k => (k.Trim().Length > 0) && (k != "$select") && (k != "$expand"))
                        .Select(k => k + "=" + map[k])
                        .ToAggregateString("&");

      var newUrl = oldUri.Scheme + "://" + oldUri.Authority + oldUri.AbsolutePath + "?" + newQuery;
      var newUri = new Uri(newUrl);

      var newRequest = new HttpRequestMessage(request.Method, newUri);
      var newQo = new ODataQueryOptions(queryOptions.Context, newRequest);
      return newQo;
    }

    /// <summary>
    /// Provide a hook to do any processing before applying the query.  This implementation does nothing.
    /// </summary>
    /// <param name="queryable"></param>
    /// <param name="queryOptions"></param>
    /// <returns></returns>
    public virtual IQueryable BeforeApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions) {
      return queryable;
    }

    public IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions) {
      return QueryHelper.ApplyQuery(queryable, queryOptions, this.querySettings);
    }

    /// <summary>
    /// Apply the queryOptions to the query.  
    /// This method handles nested order-by statements the the current ASP.NET web api does not yet support.
    /// </summary>
    /// <param name="queryable"></param>
    /// <param name="queryOptions"></param>
    /// <param name="querySettings"></param>
    /// <returns></returns>
    public static IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions, ODataQuerySettings querySettings) {

      // Basic idea here is the current WebApi OData cannot support the following operations
      // 1) "orderby" with  nested properties
      // 2) "select" with complex types
      // 3) "selects" of "nested" properties unless accompanied by the appropriate "expand".  
      //     i.e. can't do Customers.select("orders") unless we also add expand("orders")

      // The workaround here is to bypass "select" and "orderBy" processing under these conditions 
      // This involves removing the "offending" queryOptions before asking the WebApi2 OData processing to do its thing
      // and then post processing the resulting IQueryable. 
      // We actually do this with all selects because it's easier than trying to determine if they are actually problematic. 

      // Another approach that DOESN'T work is to let WebApi2 OData try to do it stuff and then only handle the cases where it throws an exception.
      // This doesn't work because WebApi2 OData will actually just skip the portions of the query that it can't process and return what it can ( under some conditions). 

      var expandQueryString = queryOptions.RawValues.Expand;
      var orderByQueryString = queryOptions.RawValues.OrderBy;
      var selectQueryString = queryOptions.RawValues.Select;

      ODataQueryOptions newQueryOptions = queryOptions;
      if (selectQueryString != null) {
        newQueryOptions = QueryHelper.RemoveSelectAndExpand(newQueryOptions);
      }

      if (orderByQueryString != null && orderByQueryString.IndexOf('/') >= 0) {
        newQueryOptions = QueryHelper.RemoveSelectAndExpand(newQueryOptions);
        newQueryOptions = QueryHelper.RemoveExtendedOps(newQueryOptions);
      }

      if (newQueryOptions == queryOptions) {
        return queryOptions.ApplyTo(queryable, querySettings);
      } else {
        // apply default processing first with "unsupported" stuff removed. 
        var q = newQueryOptions.ApplyTo(queryable, querySettings);
        // then apply unsupported stuff. 
        var qh = new QueryHelper(querySettings);
        if (selectQueryString != null) {
          q = qh.ApplySelect(q, selectQueryString);
        } else if (expandQueryString != null) {
          // don't bother doing an expand if there was already a select ( this code doesn't need it)
          q = qh.ApplyExpand(q, queryOptions.RawValues.Expand);
        }       

        if (orderByQueryString != null && orderByQueryString.IndexOf('/') >= 0) {
          q = qh.ApplyNestedOrderBy(q, queryOptions);
        }
        return q;
      }


    }

    private IQueryable ApplyNestedOrderBy(IQueryable queryable, ODataQueryOptions queryOptions) {
      var elementType = TypeFns.GetElementType(queryable.GetType());
      var result = queryable;
      string inlinecountString = queryOptions.RawValues.InlineCount;
      if (!string.IsNullOrWhiteSpace(inlinecountString)) {
        if (inlinecountString == "allpages") {
          if (result is IQueryable) {
            var inlineCount = (Int64)Queryable.Count((dynamic)result);
            queryOptions.Request.SetInlineCount(inlineCount);
          }
        }
      }

      var orderByClauses = queryOptions.RawValues.OrderBy.Split(',').ToList();
      var isThenBy = false;
      orderByClauses.ForEach(obc => {
        var func = QueryBuilder.BuildOrderByFunc(isThenBy, elementType, obc);
        result = func(result);
        isThenBy = true;
      });

      var skipQueryString = queryOptions.RawValues.Skip;
      if (!string.IsNullOrWhiteSpace(skipQueryString)) {
        var count = int.Parse(skipQueryString);
        var method = TypeFns.GetMethodByExample((IQueryable<String> q) => Queryable.Skip<String>(q, 999), elementType);
        var func = BuildIQueryableFunc(elementType, method, count);
        result = func(result);
      }

      var topQueryString = queryOptions.RawValues.Top;
      if (!string.IsNullOrWhiteSpace(topQueryString)) {
        var count = int.Parse(topQueryString);
        var method = TypeFns.GetMethodByExample((IQueryable<String> q) => Queryable.Take<String>(q, 999), elementType);
        var func = BuildIQueryableFunc(elementType, method, count);
        result = func(result);
      }




      return result;
    }

    private static Func<IQueryable, IQueryable> BuildIQueryableFunc<TArg>(Type instanceType, MethodInfo method, TArg parameter, Type queryableBaseType = null) {
      if (queryableBaseType == null) {
        queryableBaseType = typeof(IQueryable<>);
      }
      var paramExpr = Expression.Parameter(typeof(IQueryable));
      var queryableType = queryableBaseType.MakeGenericType(instanceType);
      var castParamExpr = Expression.Convert(paramExpr, queryableType);

      var callExpr = Expression.Call(method, castParamExpr, Expression.Constant(parameter));
      var castResultExpr = Expression.Convert(callExpr, typeof(IQueryable));
      var lambda = Expression.Lambda(castResultExpr, paramExpr);
      var func = (Func<IQueryable, IQueryable>)lambda.Compile();
      return func;
    }


    /// <summary>
    /// Apply the select clause to the queryable
    /// </summary>
    /// <param name="queryable"></param>
    /// <param name="selectQueryString"></param>
    /// <returns></returns>
    public virtual IQueryable ApplySelect(IQueryable queryable, string selectQueryString) {
      var selectClauses = selectQueryString.Split(',').Select(sc => sc.Replace('/', '.')).ToList();
      var elementType = TypeFns.GetElementType(queryable.GetType());
      var func = QueryBuilder.BuildSelectFunc(elementType, selectClauses);
      return func(queryable);
    }

    /// <summary>
    /// Apply to expands clause to the queryable
    /// </summary>
    /// <param name="queryable"></param>
    /// <param name="expandsQueryString"></param>
    /// <returns></returns>
    public virtual IQueryable ApplyExpand(IQueryable queryable, string expandsQueryString) {
      expandsQueryString.Split(',').Select(s => s.Trim()).ToList().ForEach(expand => {
        queryable = ((dynamic)queryable).Include(expand.Replace('/', '.'));
      });
      return queryable;
    }


    /// <summary>
    /// Perform any work after the query is executed.  Does nothing in this implementation but is available to derived classes.
    /// </summary>
    /// <param name="queryResult"></param>
    /// <returns></returns>
    public virtual IEnumerable PostExecuteQuery(IEnumerable queryResult) {
      return queryResult;
    }

    /// <summary>
    /// Replaces the response.Content with the query results, wrapped in a QueryResult object if necessary.
    /// </summary>
    /// <param name="request"></param>
    /// <param name="response"></param>
    /// <param name="responseObject"></param>
    /// <param name="queryable"></param>
    public virtual void WrapResult(HttpRequestMessage request, HttpResponseMessage response, IQueryable queryResult) {
      Object tmp;
      request.Properties.TryGetValue("MS_InlineCount", out tmp);
      var inlineCount = (Int64?)tmp;

      // if a select or expand was encountered we need to
      // execute the DbQueries here, so that any exceptions thrown can be properly returned.
      // if we wait to have the query executed within the serializer, some exceptions will not
      // serialize properly.
      var listQueryResult = Enumerable.ToList((dynamic)queryResult);
      var elementType = queryResult.ElementType;
      if (elementType.Name.StartsWith("SelectAllAndExpand")) {
        var prop = elementType.GetProperties().FirstOrDefault(pi => pi.Name == "Instance");
        var mi = prop.GetGetMethod();
        var lqr = (List<Object>)listQueryResult;
        listQueryResult = (dynamic) lqr.Select(item => {
          var instance = mi.Invoke(item, null);
          return (Object) instance;
        }).ToList();
      }

      // HierarchyNodeExpressionVisitor
      listQueryResult = PostExecuteQuery((IEnumerable) listQueryResult);
      
      if (listQueryResult != null || inlineCount.HasValue) {
        Object result = listQueryResult;
        if (inlineCount.HasValue) {
          result = new QueryResult() { Results = listQueryResult, InlineCount = inlineCount };
        } 

        var formatter = ((dynamic)response.Content).Formatter;
        var oc = new ObjectContent(result.GetType(), result, formatter);
        response.Content = oc;
      }
    }


    /// <summary>
    /// Configure the JsonFormatter.  Does nothing in this implementation but is available to derived classes.
    /// </summary>
    /// <param name="request">Used to retrieve the current JsonFormatter</param>
    /// <param name="queryable">Used to obtain the ISession</param>
    public virtual void ConfigureFormatter(HttpRequestMessage request, IQueryable queryable) {
      var jsonFormatter = request.GetConfiguration().Formatters.JsonFormatter;
      ConfigureFormatter(jsonFormatter, queryable);
    }

    /// <summary>
    /// Configure the JsonFormatter.  Does nothing in this implementation but is available to derived classes.
    /// </summary>
    /// <param name="jsonFormatter"></param>
    /// <param name="queryable">Used to obtain the ISession</param>
    public virtual void ConfigureFormatter(JsonMediaTypeFormatter jsonFormatter, IQueryable queryable) {
    }


  }

  /// <summary>
  /// Wrapper for results that have an InlineCount, to support paged result sets.
  /// </summary>
  public class QueryResult {
    public dynamic Results { get; set; }
    public Int64? InlineCount { get; set; }
  }
}
