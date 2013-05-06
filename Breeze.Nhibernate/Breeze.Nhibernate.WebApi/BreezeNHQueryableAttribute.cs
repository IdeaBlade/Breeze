using Breeze.WebApi;
using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;

namespace Breeze.Nhibernate.WebApi
{
    /// <summary>
    /// Override the BreezeQueryableAttribute to implement the expand function for NHibernate.
    /// Use this attribute on each method in your WebApi controller that returns an IQueryable.
    /// <see cref="http://www.breezejs.com/sites/all/apidocs/classes/EntityQuery.html#method_expand"/>
    /// </summary>
    [AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, Inherited = true, AllowMultiple = false)]
    public class BreezeNHQueryableAttribute : BreezeQueryableAttribute
    {
        public override void OnActionExecuted(System.Web.Http.Filters.HttpActionExecutedContext actionExecutedContext)
        {
            ConfigureFormatter(actionExecutedContext.Request, null);

            base.OnActionExecuted(actionExecutedContext);
        }

        public override IQueryable ApplyExpand(IQueryable queryable, string expandsQueryString, HttpRequestMessage request)
        {
            var expandMap = new Dictionary<Type, List<string>>();

            queryable = ApplyExpansions(queryable, expandsQueryString, expandMap);

            ConfigureFormatter(request, expandMap);

            return queryable;
        }

        /// <summary>
        /// Configure the JsonFormatter to only serialize the requested properties
        /// </summary>
        /// <param name="request"></param>
        /// <param name="includedTypeProperties"></param>
        private void ConfigureFormatter(HttpRequestMessage request, Dictionary<Type, List<string>> includedTypeProperties)
        {
            var jsonFormatter = request.GetConfiguration().Formatters.JsonFormatter;
            var settings = jsonFormatter.SerializerSettings;
            settings.Formatting = Formatting.Indented;
            //settings.Error = delegate(object sender, Newtonsoft.Json.Serialization.ErrorEventArgs args)
            //{
            //    logger.Error(args.ErrorContext.Error.Message);
            //    args.ErrorContext.Handled = true;
            //};
            settings.ContractResolver = new NHIncludingContractResolver(NHEagerFetch.sessionFactory, includedTypeProperties);

        }

        /// <summary>
        /// Calls NHEagerFetch.ApplyExpansions
        /// </summary>
        /// <param name="queryable">The query to expand</param>
        /// <param name="expandsQueryString">value of the $expand query parameter</param>
        /// <param name="expandMap">Empty dictionary that will be populated with the names of the expanded properties for each type.</param>
        /// <returns></returns>
        protected IQueryable ApplyExpansions(IQueryable queryable, string expandsQueryString, Dictionary<Type, List<string>> expandMap)
        {
            if (string.IsNullOrWhiteSpace(expandsQueryString))
            {
                return queryable;
            }

            string[] expandPaths = expandsQueryString.Split(',').Select(s => s.Trim()).ToArray();
            if (!expandPaths.Any()) throw new Exception("Expansion Paths cannot be null");

            if (queryable == null) throw new Exception("Query cannot be null");

            return NHEagerFetch.ApplyExpansions(queryable, expandPaths, expandMap);

        }
        /* try this later
        public override IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions)
        {
            IQueryable result;

            // Execute the query before applying the queryOptions.  
            // This is because the NH query translator chokes on so many options
            // TODO find a better way to resolve this.
            //var provider = queryable.Provider as DefaultQueryProvider;
            //var exp = queryable.Expression;
            //var future = provider.ExecuteFuture(exp);

            // NHibernate.OData only understands filter, orderby, skip, and top.
            var request = queryOptions.Request;
            var oldUri = request.RequestUri;
            var map = oldUri.ParseQueryString();
            var queryString = map.Keys.Cast<String>()
                    .Where(k => k == "$filter" || k == "$orderby" || k == "$skip" || k == "$top")
                    .Select(k => k + "=" + map[k])
                    .ToAggregateString("&");
            
            var session = NHEagerFetch.sessionFactory.OpenSession();
            var type = queryable.ElementType;
            var criteria = ODataParser.ODataQuery(session, type, queryString);

            var expandMap = new Dictionary<Type, List<string>>();
            var expandsQueryString = map["$expand"];
            if (!string.IsNullOrWhiteSpace(expandsQueryString))
            {
                string[] expandPaths = expandsQueryString.Split(',').Select(s => s.Trim()).ToArray();
                criteria = NHEagerFetch.ApplyExpansions(criteria, expandPaths, NHEagerFetch.sessionFactory, expandMap);
            }

            var selectQueryString = map["$select"];
            if (!string.IsNullOrWhiteSpace(selectQueryString))
            {
                criteria = ApplySelect(criteria, selectQueryString);
            }

            // Execute the query
            var criteriaResult = criteria.List();

            result = criteriaResult.AsQueryable();

            // TODO apply any expression that existed on the original queryable

            ConfigureFormatter(request, expandMap);

            return result;

        }

        private ICriteria ApplySelect(ICriteria criteria, string selectQueryString)
        {
            var selectClauses = selectQueryString.Split(',').Select(sc => sc.Replace('/', '.')).ToList();

            var list = Projections.ProjectionList();
            foreach (var clause in selectClauses)
            {
                list.Add(Projections.Property(clause));
            }
            return criteria.SetProjection(list);

        }
        */
    }
}
