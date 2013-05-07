using Breeze.WebApi;
using Newtonsoft.Json;
using NHibernate;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Web.Http.OData.Query;

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
        private static string EXPAND_MAP_KEY = "BreezeNHQueryableAttribute_ExpandMap";

        /// <summary>
        /// Sets HandleNullPropagation = false on the base class.  Otherwise it's true for non-EF, and that
        /// complicates the query expressions and breaks NH's query parser.
        /// </summary>
        public BreezeNHQueryableAttribute() : base()
        {
            base.HandleNullPropagation = HandleNullPropagationOption.False;
        }

        /// <summary>
        /// Executes the NHibernate query and initializes the lazy proxies before serialization
        /// </summary>
        /// <param name="actionExecutedContext"></param>
        public override void OnActionExecuted(System.Web.Http.Filters.HttpActionExecutedContext actionExecutedContext)
        {
            base.OnActionExecuted(actionExecutedContext);

            object responseObject;
            if (!actionExecutedContext.Response.TryGetContentValue(out responseObject))
                return;

            // Execute the query (responseObject should be IQueryable)
            var list = Enumerable.ToList((dynamic)responseObject);

            object stored;
            actionExecutedContext.Request.Properties.TryGetValue(EXPAND_MAP_KEY, out stored);
            var expandMap = stored as ExpandTypeMap;

            if (expandMap != null)
            {
                // Initialize the NHibernate proxies
                var map = expandMap.map;
                var depth = expandMap.maxDepth;
                foreach (var el in list)
                {
                    InitializeWithCascade(el, map, depth);
                }
            }

            actionExecutedContext.Request.Properties.TryGetValue("Context", out stored);
            var context = stored as NHContext;
            if (context != null)
            {
                var session = context.session;
                if (session.IsOpen) session.Close();

                // Limit serialization by catching LazyInitializationExceptions
                ConfigureFormatter(actionExecutedContext.Request);
            }
            else
            {
                // We couldn't close the session, so limit serialization using the expandMap
                ConfigureFormatter(actionExecutedContext.Request, expandMap);
            }


        }

        /// <summary>
        /// Recursively forces loading of each NHibernate proxy in the tree that matches an entry in the map.
        /// </summary>
        /// <param name="parent">Top-level object</param>
        /// <param name="map">Map of properties to initialize for each type</param>
        /// <param name="remainingDepth">How deep to follow the tree; prevents infinite looping</param>
        protected void InitializeWithCascade(object parent, IDictionary<Type, List<String>> map, int remainingDepth)
        {
            if (remainingDepth < 0) return;
            remainingDepth--;
            var type = parent.GetType();
            if (!map.ContainsKey(type)) return;

            var propNames = map[type];
            foreach (var name in propNames)
            {
                // Get the child object for the property name
                var propInfo = type.GetProperty(name);
                var methInfo = propInfo.GetGetMethod();
                var child = methInfo.Invoke(parent, null);

                var collection = child as System.Collections.ICollection;
                if (collection != null)
                {
                    System.Collections.IEnumerator iter = collection.GetEnumerator();
                    while (iter.MoveNext())
                    {
                        NHibernateUtil.Initialize(iter.Current);
                        InitializeWithCascade(iter.Current, map, remainingDepth);
                    }
                }
                else
                {
                    NHibernateUtil.Initialize(child);
                    InitializeWithCascade(child, map, remainingDepth);
                }
            }

        }

        /// <summary>
        /// Overrides the method in BreezeQueryableAttribute to perform the $expands in NHibernate.
        /// Also populates the ExpandTypeMap that controls lazy initialization and serialization.
        /// </summary>
        /// <param name="queryable"></param>
        /// <param name="expandsQueryString"></param>
        /// <param name="request"></param>
        /// <returns></returns>
        public override IQueryable ApplyExpand(IQueryable queryable, string expandsQueryString, HttpRequestMessage request)
        {
            var expandMap = new ExpandTypeMap();

            queryable = ApplyExpansions(queryable, expandsQueryString, expandMap);

            request.Properties.Add(EXPAND_MAP_KEY, expandMap);

            return queryable;
        }

        /// <summary>
        /// Configure the JsonFormatter to only serialize the requested properties
        /// </summary>
        /// <param name="request"></param>
        /// <param name="expandMap">Contains the types and properties to serialize</param>
        private void ConfigureFormatter(HttpRequestMessage request, ExpandTypeMap expandMap)
        {
            var jsonFormatter = request.GetConfiguration().Formatters.JsonFormatter;
            var settings = jsonFormatter.SerializerSettings;
            settings.Formatting = Formatting.Indented;
            if (expandMap != null)
            {
                settings.ContractResolver = new NHIncludingContractResolver(NHEagerFetch.sessionFactory, expandMap.map);
            }
            else
            {
                settings.ContractResolver = new NHIncludingContractResolver(NHEagerFetch.sessionFactory);
            }

            settings.Converters.Add(new NHibernateProxyJsonConverter());
        }

        /// <summary>
        /// Configure the JsonFormatter to only serialize the already-initialized properties
        /// </summary>
        /// <param name="request"></param>
        private void ConfigureFormatter(HttpRequestMessage request)
        {
            var jsonFormatter = request.GetConfiguration().Formatters.JsonFormatter;
            var settings = jsonFormatter.SerializerSettings;
            settings.Formatting = Formatting.Indented;
            settings.Error = delegate(object sender, Newtonsoft.Json.Serialization.ErrorEventArgs args)
            {
                // When the NHibernate session is closed, NH proxies throw LazyInitializationException when
                // the serializer tries to access them.  We want to ignore those exceptions.
                var error = args.ErrorContext.Error;
                if (error is LazyInitializationException)
                    args.ErrorContext.Handled = true;
            };

            settings.Converters.Add(new NHibernateProxyJsonConverter());
        }


        /// <summary>
        /// Calls NHEagerFetch.ApplyExpansions
        /// </summary>
        /// <param name="queryable">The query to expand</param>
        /// <param name="expandsQueryString">value of the $expand query parameter</param>
        /// <param name="expandMap">Empty dictionary that will be populated with the names of the expanded properties for each type.</param>
        /// <returns></returns>
        protected IQueryable ApplyExpansions(IQueryable queryable, string expandsQueryString, ExpandTypeMap expandMap)
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

        //public override IQueryable ApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions)
        //{
        //    var settings = new ODataQuerySettings() { HandleNullPropagation = HandleNullPropagationOption.False};
        //    var q2 = queryOptions.ApplyTo(queryable, settings);
        //    return q2;
        //}
    
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
