using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System;
using System.Collections;
using System.Linq;
using System.Linq.Expressions;
using System.Net.Http;
using System.Reflection;
using System.Web.Http;
using System.Web.Http.Filters;
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

        public IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions)
        {
            return queryOptions.ApplyTo(queryable, querySettings);
        }

        public static IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions, ODataQuerySettings querySettings)
        {
            return queryOptions.ApplyTo(queryable, querySettings);
        }

        public IQueryable ApplyExtendedOrderBy(IQueryable queryable, ODataQueryOptions queryOptions)
        {
            return ApplyExtendedOrderBy(queryable, queryOptions, querySettings);
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

    }
}
