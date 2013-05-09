using Breeze.WebApi;
using Newtonsoft.Json;
using NHibernate;
using NHibernate.Linq;
using System;
using System.Collections;
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
        // Used for storing the ExpandTypeMap and Session in the Request
        protected static readonly string EXPAND_MAP_KEY = "BreezeNHQueryableAttribute_ExpandMap";
        protected static readonly string NH_SESSION_KEY = "BreezeNHQueryableAttribute_NHSession";

        /// <summary>
        /// Sets HandleNullPropagation = false on the base class.  Otherwise it's true for non-EF, and that
        /// complicates the query expressions and breaks NH's query parser.
        /// </summary>
        public BreezeNHQueryableAttribute() : base()
        {
            base.HandleNullPropagation = HandleNullPropagationOption.False;
        }

        /// <summary>
        /// Store the session in the request properties for use by the OnActionExecuted method
        /// </summary>
        /// <param name="request"></param>
        /// <param name="session"></param>
        public static void SetSession(HttpRequestMessage request, object session)
        {
            if (!(session is ISession))
                throw new ArgumentException("Argument must be NHibernate.ISession", "session");
            request.Properties.Add(NH_SESSION_KEY, session);
        }

        /// <summary>
        /// Executes the NHibernate query and initializes the lazy proxies before serialization
        /// </summary>
        /// <param name="actionExecutedContext"></param>
        public override void OnActionExecuted(System.Web.Http.Filters.HttpActionExecutedContext actionExecutedContext)
        {
            if (actionExecutedContext.Response == null) return; 
            object responseObject;
            if (actionExecutedContext.Response == null || !actionExecutedContext.Response.TryGetContentValue(out responseObject))
                return;

            if (responseObject is IQueryable)
            {
                var nhQueryable = responseObject as IQueryableInclude;
                if (nhQueryable != null)
                {
                    // perform expansion based on the Include() clauses 
                    var includes = nhQueryable.GetIncludes();
                    if (includes != null)
                    {
                        this.ApplyExpansions(nhQueryable, includes, actionExecutedContext.Request);
                    }
                }

                var returnType = actionExecutedContext.ActionContext.ActionDescriptor.ReturnType;

                if (typeof(IEnumerable).IsAssignableFrom(returnType))
                {
                    // Apply $select and $expand in the base class
                    base.OnActionExecuted(actionExecutedContext);

                    if (!actionExecutedContext.Response.TryGetContentValue(out responseObject))
                        return;

                    var queryResult = responseObject as QueryResult;
                    if (queryResult != null) responseObject = queryResult.Results;

                    var list = Enumerable.ToList((dynamic)responseObject);

                    var expandMap = GetRequestProperty(actionExecutedContext.Request, EXPAND_MAP_KEY) as ExpandTypeMap;
                    // Initialize the NHibernate proxies
                    NHInitializer.InitializeList(list, expandMap);

                    if (queryResult != null)
                    {
                        // Put the results in the existing wrapper
                        queryResult.Results = list;
                    }
                    else
                    {
                        // replace the IQueryable with the executed list, so it won't be re-executed by the serializer
                        var formatter = ((dynamic)actionExecutedContext.Response.Content).Formatter;
                        var oc = new ObjectContent(list.GetType(), list, formatter);
                        actionExecutedContext.Response.Content = oc;
                    }
                }
                else
                {
                    // Execute the query for a non-enumerable type
                    var result = Enumerable.ToList((dynamic)responseObject);

                    // replace the IQueryable with the executed list, so it won't be re-executed by the serializer
                    var formatter = ((dynamic)actionExecutedContext.Response.Content).Formatter;
                    var oc = new ObjectContent(result.GetType(), result, formatter);
                    actionExecutedContext.Response.Content = oc;
                }
            }

            // Even with no IQueryable, we still need to configure the formatter to prevent runaway serialization.
            ConfigureFormatter(actionExecutedContext.Request);

        }

        /// <summary>
        /// Configure the JsonFormatter to limit the object serialization of the response.
        /// </summary>
        /// <param name="request"></param>
        private void ConfigureFormatter(HttpRequestMessage request)
        {
            var session = GetRequestProperty(request, NH_SESSION_KEY) as ISession;
            if (session != null)
            {
                if (session.IsOpen) session.Close();

                // Limit serialization by catching LazyInitializationExceptions
                ConfigureFormatterByHandler(request);
            }
            else
            {
                // Limit serialization by only allowing properties int the map
                var expandMap = GetRequestProperty(request, EXPAND_MAP_KEY) as ExpandTypeMap;
                ConfigureFormatterByMap(request, expandMap);
            }
        }

        /// <summary>
        /// Configure the JsonFormatter to only serialize the requested properties
        /// </summary>
        /// <param name="request"></param>
        /// <param name="expandMap">Contains the types and properties to serialize</param>
        /// <param name="session">Used for getting the class meta data for the contract resolver.</param>
        private void ConfigureFormatterByMap(HttpRequestMessage request, ExpandTypeMap expandMap)
        {
            var jsonFormatter = request.GetConfiguration().Formatters.JsonFormatter;
            var settings = jsonFormatter.SerializerSettings;
            settings.Formatting = Formatting.Indented;

            if (expandMap != null)
            {
                settings.ContractResolver = new IncludingContractResolver(expandMap.map);
            }
            else
            {
                settings.ContractResolver = new IncludingContractResolver();
            }

            settings.Converters.Add(new NHibernateProxyJsonConverter());
        }

        /// <summary>
        /// Configure the JsonFormatter to only serialize the already-initialized properties
        /// </summary>
        /// <param name="request"></param>
        private void ConfigureFormatterByHandler(HttpRequestMessage request)
        {
            var jsonFormatter = request.GetConfiguration().Formatters.JsonFormatter;
            var settings = jsonFormatter.SerializerSettings;
            settings.Formatting = Formatting.Indented;
            settings.Error = delegate(object sender, Newtonsoft.Json.Serialization.ErrorEventArgs args)
            {
                // When the NHibernate session is closed, NH proxies throw LazyInitializationException when
                // the serializer tries to access them.  We want to ignore those exceptions.
                var error = args.ErrorContext.Error;
                if (error is LazyInitializationException || error is ObjectDisposedException)
                    args.ErrorContext.Handled = true;
            };

            settings.Converters.Add(new NHibernateProxyJsonConverter());
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
            var expandMap = GetRequestProperty(request, EXPAND_MAP_KEY) as ExpandTypeMap;
            if (expandMap == null) expandMap = new ExpandTypeMap();

            var session = GetRequestProperty(request, NH_SESSION_KEY) as ISession;
            queryable = ApplyExpansions(queryable, expandsQueryString, expandMap, session.SessionFactory);

            if (!request.Properties.ContainsKey(EXPAND_MAP_KEY))
                request.Properties.Add(EXPAND_MAP_KEY, expandMap);

            return queryable;
        }

        /// <summary>
        /// Performs expands based on the list of strings.
        /// Also populates the ExpandTypeMap that controls lazy initialization and serialization.
        /// </summary>
        /// <param name="queryable"></param>
        /// <param name="expands"></param>
        /// <param name="request"></param>
        /// <returns></returns>
        protected IQueryable ApplyExpansions(IQueryable queryable, IList<string> expands, HttpRequestMessage request)
        {
            var expandMap = GetRequestProperty(request, EXPAND_MAP_KEY) as ExpandTypeMap;
            if (expandMap == null) expandMap = new ExpandTypeMap();

            var session = GetRequestProperty(request, NH_SESSION_KEY) as ISession;
            if (queryable == null) throw new Exception("Query cannot be null");

            var fetcher = new NHEagerFetch(session.SessionFactory);
            queryable = fetcher.ApplyExpansions(queryable, expands.ToArray(), expandMap);

            if (!request.Properties.ContainsKey(EXPAND_MAP_KEY))
                request.Properties.Add(EXPAND_MAP_KEY, expandMap);

            return queryable;
        }

        /// <summary>
        /// Calls NHEagerFetch.ApplyExpansions
        /// </summary>
        /// <param name="queryable">The query to expand</param>
        /// <param name="expandsQueryString">value of the $expand query parameter</param>
        /// <param name="expandMap">Empty dictionary that will be populated with the names of the expanded properties for each type.</param>
        /// <returns></returns>
        protected IQueryable ApplyExpansions(IQueryable queryable, string expandsQueryString, ExpandTypeMap expandMap, ISessionFactory sessionFactory)
        {
            if (string.IsNullOrWhiteSpace(expandsQueryString))
            {
                return queryable;
            }

            string[] expandPaths = expandsQueryString.Split(',').Select(s => s.Trim()).ToArray();
            if (!expandPaths.Any()) throw new Exception("Expansion Paths cannot be null");
            if (queryable == null) throw new Exception("Query cannot be null");

            var fetcher = new NHEagerFetch(sessionFactory);
            return fetcher.ApplyExpansions(queryable, expandPaths, expandMap);

        }

        /// <summary>
        /// Get a property from the request using the given key.
        /// </summary>
        private object GetRequestProperty(HttpRequestMessage request, string key)
        {
            object stored;
            request.Properties.TryGetValue(key, out stored);
            return stored;
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
