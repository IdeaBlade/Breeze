using System;
using System.Collections;
using System.Collections.Specialized;
using System.Linq;
using System.Linq.Expressions;
using System.Net.Http;
using System.Reflection;
using System.Web.Http.OData.Query;

namespace Breeze.WebApi
{
    public class QueryHelper
    {
        protected ODataQuerySettings querySettings;

        public QueryHelper(ODataQuerySettings querySettings)
        {
            this.querySettings = querySettings;
        }

        public QueryHelper(bool enableConstantParameterization, bool ensureStableOrdering, HandleNullPropagationOption handleNullPropagation, int? pageSize)
        {
            this.querySettings = NewODataQuerySettings(enableConstantParameterization, ensureStableOrdering, handleNullPropagation, pageSize);
        }

        public QueryHelper() : this(true, true, HandleNullPropagationOption.False, null)
        {
            
        }

        public static ODataQuerySettings NewODataQuerySettings(bool enableConstantParameterization, bool ensureStableOrdering, HandleNullPropagationOption handleNullPropagation, int? pageSize)
        {
            var settings = new ODataQuerySettings();
            settings.EnableConstantParameterization = enableConstantParameterization;
            settings.EnsureStableOrdering = ensureStableOrdering;
            settings.HandleNullPropagation = handleNullPropagation;
            if (pageSize > 0)
                settings.PageSize = pageSize;
            return settings;
        }

        /// <summary>returns a copy of queryOptions with $orderby, $top, and $skip removed.</summary>
        public static ODataQueryOptions RemoveExtendedOps(ODataQueryOptions queryOptions)
        {
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

        public virtual IQueryable BeforeApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions)
        {
            return queryable;
        }

        public IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions)
        {
            return queryOptions.ApplyTo(queryable, this.querySettings);
        }

        public static IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions, ODataQuerySettings querySettings)
        {
            return queryOptions.ApplyTo(queryable, querySettings);
        }

        public IQueryable ApplyExtendedOrderBy(IQueryable queryable, ODataQueryOptions queryOptions)
        {
            return ApplyExtendedOrderBy(queryable, queryOptions, this.querySettings);
        }

        public static IQueryable ApplyExtendedOrderBy(IQueryable queryable, ODataQueryOptions queryOptions, ODataQuerySettings querySettings)
        {
            // if we see an extended order by we also need to process any skip/take operators as well.
            var orderByQueryString = queryOptions.RawValues.OrderBy;
            if (orderByQueryString == null || orderByQueryString.IndexOf('/') < 0)
            {
                return null;
            }

            var newQueryOptions = QueryHelper.RemoveExtendedOps(queryOptions);

            var result = QueryHelper.ApplyQuery(queryable, newQueryOptions, querySettings);

            var elementType = TypeFns.GetElementType(queryable.GetType());

            var orderByClauses = orderByQueryString.Split(',').ToList();
            var isThenBy = false;
            orderByClauses.ForEach(obc =>
            {
                var func = QueryBuilder.BuildOrderByFunc(isThenBy, elementType, obc);
                result = func(result);
                isThenBy = true;
            });

            var skipQueryString = queryOptions.RawValues.Skip;
            if (!string.IsNullOrWhiteSpace(skipQueryString))
            {
                var count = int.Parse(skipQueryString);
                var method = TypeFns.GetMethodByExample((IQueryable<String> q) => Queryable.Skip<String>(q, 999), elementType);
                var func = BuildIQueryableFunc(elementType, method, count);
                result = func(result);
            }

            var topQueryString = queryOptions.RawValues.Top;
            if (!string.IsNullOrWhiteSpace(topQueryString))
            {
                var count = int.Parse(topQueryString);
                var method = TypeFns.GetMethodByExample((IQueryable<String> q) => Queryable.Take<String>(q, 999), elementType);
                var func = BuildIQueryableFunc(elementType, method, count);
                result = func(result);
            }
            return result;
        }

        private static Func<IQueryable, IQueryable> BuildIQueryableFunc<TArg>(Type instanceType, MethodInfo method, TArg parameter, Type queryableBaseType = null)
        {
            if (queryableBaseType == null)
            {
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
        public virtual IQueryable ApplySelectAndExpand(IQueryable queryable, NameValueCollection map)
        {
            var result = queryable;
            var hasSelectOrExpand = false;

            var selectQueryString = map["$select"];
            if (!string.IsNullOrWhiteSpace(selectQueryString))
            {
                result = ApplySelect(queryable, selectQueryString);
                hasSelectOrExpand = true;
            }

            var expandsQueryString = map["$expand"];
            if (!string.IsNullOrWhiteSpace(expandsQueryString))
            {
                if (hasSelectOrExpand)
                {
                    throw new Exception("Use of both 'expand' and 'select' in the same query is not currently supported");
                }
                result = ApplyExpand(queryable, expandsQueryString);
                hasSelectOrExpand = true;
            }

            return result;
            //IEnumerable rQuery = null;
            //if (hasSelectOrExpand)
            //{
            //    // if a select or expand was encountered we need to
            //    // execute the DbQueries here, so that any exceptions thrown can be properly returned.
            //    // if we wait to have the query executed within the serializer, some exceptions will not
            //    // serialize properly.
            //    rQuery = Enumerable.ToList((dynamic)result);
            //}

            //return rQuery;
        }

        /// <summary>
        /// Apply the select clause to the queryable
        /// </summary>
        /// <param name="queryable"></param>
        /// <param name="selectQueryString"></param>
        /// <param name="request">not used, but available to overriding methods</param>
        /// <returns></returns>
        public virtual IQueryable ApplySelect(IQueryable queryable, string selectQueryString)
        {
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
        /// <param name="request">not used, but available to overriding methods</param>
        /// <returns></returns>
        public virtual IQueryable ApplyExpand(IQueryable queryable, string expandsQueryString)
        {
            expandsQueryString.Split(',').Select(s => s.Trim()).ToList().ForEach(expand =>
            {
                queryable = ((dynamic)queryable).Include(expand.Replace('/', '.'));
            });
            return queryable;
        }

        public virtual IEnumerable PostExecuteQuery(IEnumerable queryResult)
        {
            return queryResult;
        }

        /// <summary>
        /// Replaces the response.Content with the query results, wrapped in a QueryResult object if necessary.
        /// </summary>
        /// <param name="request"></param>
        /// <param name="response"></param>
        /// <param name="responseObject"></param>
        /// <param name="queryable"></param>
        public virtual void WrapResult(HttpRequestMessage request, HttpResponseMessage response, object responseObject, object queryResult)
        {
            Object tmp;
            request.Properties.TryGetValue("MS_InlineCount", out tmp);
            var inlineCount = (Int64?)tmp;

            // if a select or expand was encountered we need to
            // execute the DbQueries here, so that any exceptions thrown can be properly returned.
            // if we wait to have the query executed within the serializer, some exceptions will not
            // serialize properly.
            if (queryResult != responseObject)
            {
            }
            queryResult = Enumerable.ToList((dynamic)queryResult);
            queryResult = PostExecuteQuery((IEnumerable)queryResult);

            if (queryResult != null || inlineCount.HasValue)
            {
                if (queryResult == null)
                {
                    queryResult = responseObject;
                }
                if (inlineCount.HasValue)
                {
                    queryResult = new QueryResult() { Results = queryResult, InlineCount = inlineCount };
                }

                var formatter = ((dynamic)response.Content).Formatter;
                var oc = new ObjectContent(queryResult.GetType(), queryResult, formatter);
                response.Content = oc;
            }

        }

    }
}
