using System;
using System.Collections;
using System.Collections.Specialized;
using System.Linq;
using System.Linq.Expressions;
using System.Net.Http;
using System.Net.Http.Formatting;
using System.Reflection;
using System.Web.Http.OData.Query;

namespace Breeze.WebApi {
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
                        .Where(k => (k != "$orderby") && (k != "$top") && (k != "$skip"))
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
      // if we see an extended order by we also need to process any skip/take operators as well.
      var orderByQueryString = queryOptions.RawValues.OrderBy;
      // HACK: this is a hack because on a bug in querySettings.EnsureStableOrdering = true that overrides
      // any existing order by clauses, instead of appending to them.
      querySettings.EnsureStableOrdering = false;
      if (orderByQueryString == null || orderByQueryString.IndexOf('/') < 0) {
        // Just let the default implementation handle it.
        return queryOptions.ApplyTo(queryable, querySettings);
      }

      var newQueryOptions = QueryHelper.RemoveExtendedOps(queryOptions);
      
      var result = QueryHelper.ApplyQuery(queryable, newQueryOptions, querySettings);

      var elementType = TypeFns.GetElementType(queryable.GetType());

      var orderByClauses = orderByQueryString.Split(',').ToList();
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

      
      string inlinecountString = queryOptions.RawValues.InlineCount;
      if (!string.IsNullOrWhiteSpace(inlinecountString)) {
        if (inlinecountString == "allpages") {
          if (result is IQueryable) {
            var inlineCount = (Int64) Queryable.Count((dynamic)result);
            queryOptions.Request.SetInlineCount(inlineCount);
          }
        }
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
    /// Apply the $select and $expand clauses to the queryable.
    /// </summary>
    /// <param name="queryable"></param>
    /// <param name="map">From request.RequestUri.ParseQueryString(); contains $select or $expand</param>
    /// <returns></returns>
    /// <exception>Use of both 'expand' and 'select' in the same query is not currently supported</exception>
    public virtual IQueryable ApplySelectAndExpand(IQueryable queryable, NameValueCollection map) {
      var result = queryable;
      var hasSelectOrExpand = false;

      var selectQueryString = map["$select"];
      if (!string.IsNullOrWhiteSpace(selectQueryString)) {
        result = ApplySelect(queryable, selectQueryString);
        hasSelectOrExpand = true;
      }

      var expandsQueryString = map["$expand"];
      if (!string.IsNullOrWhiteSpace(expandsQueryString)) {
        if (hasSelectOrExpand) {
          throw new Exception("Use of both 'expand' and 'select' in the same query is not currently supported");
        }
        result = ApplyExpand(queryable, expandsQueryString);
        hasSelectOrExpand = true;
      }

      return result;
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
    public virtual void WrapResult(HttpRequestMessage request, HttpResponseMessage response, object queryResult) {
      Object tmp;
      request.Properties.TryGetValue("MS_InlineCount", out tmp);
      var inlineCount = (Int64?)tmp;

      // if a select or expand was encountered we need to
      // execute the DbQueries here, so that any exceptions thrown can be properly returned.
      // if we wait to have the query executed within the serializer, some exceptions will not
      // serialize properly.
      queryResult = Enumerable.ToList((dynamic)queryResult);
      queryResult = PostExecuteQuery((IEnumerable)queryResult);

      if (queryResult != null || inlineCount.HasValue) {
        if (inlineCount.HasValue) {
          queryResult = new QueryResult() { Results = queryResult, InlineCount = inlineCount };
        }

        var formatter = ((dynamic)response.Content).Formatter;
        var oc = new ObjectContent(queryResult.GetType(), queryResult, formatter);
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
