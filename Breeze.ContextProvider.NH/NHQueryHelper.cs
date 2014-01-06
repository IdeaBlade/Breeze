using Breeze.WebApi2;
using Newtonsoft.Json;
using NHibernate;
using NHibernate.Linq;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Formatting;
using System.Reflection;
using System.Web.Http.OData.Query;

namespace Breeze.ContextProvider.NH
{
    public class NHQueryHelper : QueryHelper
    {
        protected ExpandTypeMap expandMap = new ExpandTypeMap();
        protected ISession session;

        public NHQueryHelper(bool enableConstantParameterization, bool ensureStableOrdering, HandleNullPropagationOption handleNullPropagation, int pageSize)
            : base(enableConstantParameterization, ensureStableOrdering, handleNullPropagation, pageSize)
        {
        }

        public NHQueryHelper(ODataQuerySettings querySettings) : base(querySettings)
        {
        }

        public NHQueryHelper() : base()
        {
        }

        /// <summary>
        /// Before applying the queryOptions to the queryable, perform special processing to handle
        /// $expand and work around the NHibernate IQueryable limitations
        /// </summary>
        /// <param name="queryable"></param>
        /// <param name="queryOptions"></param>
        /// <returns></returns>
        public override IQueryable BeforeApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions)
        {
            var nhQueryable = queryable as IQueryableInclude;
            if (nhQueryable != null)
            {
                queryable = NHApplyExpand(nhQueryable);
            }
            queryable = NHApplyExpand(queryable, queryOptions);

            if (!string.IsNullOrWhiteSpace(queryOptions.RawValues.Expand))
            {
                // if $expand is present, execute the query the query now, without $select and $expand, so NH won't choke on them later
                // This causes issues with nested orderby, but at least it works in the simple cases.
                var optionsToRemove = new List<String>() { "$select", "$expand", "$orderby" };
                var newOptions = RemoveOptions(queryOptions, optionsToRemove);
                queryable = newOptions.ApplyTo(queryable, querySettings);
                queryable = Queryable.AsQueryable(Enumerable.ToList((dynamic)queryable));
            }
            
            return queryable;
        }

        /// <summary>
        /// Performs expands based on the list of strings in queryable.GetIncludes().
        /// Also populates the ExpandTypeMap that controls lazy initialization and serialization.
        /// </summary>
        /// <param name="queryable"></param>
        /// <returns></returns>
        protected IQueryable NHApplyExpand(IQueryableInclude queryable)
        {
            var expands = queryable.GetIncludes();
            if (expands == null || expands.Count == 0) return queryable;
            var session = GetSession(queryable);
            var fetcher = new NHEagerFetch(session.SessionFactory);
            var expandedQueryable = fetcher.ApplyExpansions(queryable, expands.ToArray(), expandMap);

            return expandedQueryable;
        }

        /// <summary>
        /// Overrides the method in QueryHelper to perform the $expands in NHibernate.
        /// Also populates the ExpandTypeMap that controls lazy initialization and serialization.
        /// </summary>
        /// <param name="queryable"></param>
        /// <param name="expandsQueryString"></param>
        /// <returns></returns>
        protected IQueryable NHApplyExpand(IQueryable queryable, ODataQueryOptions queryOptions) {
            var expandQueryString = queryOptions.RawValues.Expand;
            if (string.IsNullOrWhiteSpace(expandQueryString)) return queryable;
            var session = GetSession(queryable);
            var fetcher = new NHEagerFetch(session.SessionFactory);
            queryable = fetcher.ApplyExpansions(queryable, expandQueryString, expandMap);

            // hack to patch up expandMap to prepare for anonymous types created by $select
            // NHInitializer recognizes "Type" as a placeholder for anonymous types
            if (!string.IsNullOrWhiteSpace(queryOptions.RawValues.Select))
            {
                var map = expandMap.map;
                var topType = queryable.ElementType;
                if (map.ContainsKey(topType))
                {
                    var list = map[topType];
                    map.Add(typeof(Type), list);
                }
            }

            return queryable;
        }

        /// <summary>
        /// Override ApplyExpand to do nothing.  NHApplyExpand takes care of expands for NH, and 
        /// it is executed earlier in the query processing (in BeforeApplyQuery)
        /// </summary>
        /// <param name="queryable"></param>
        /// <param name="queryOptions"></param>
        /// <returns></returns>
        public override IQueryable ApplyExpand(IQueryable queryable, ODataQueryOptions queryOptions)
        {
            return queryable;
        }

        /// <summary>
        /// Get the ISession from the IQueryable.
        /// </summary>
        /// <param name="queryable"></param>
        /// <returns>the session if queryable.Provider is NHibernate.Linq.DefaultQueryProvider, else null</returns>
        public ISession GetSession(IQueryable queryable)
        {
            if (session != null) return session;
            if (queryable == null) return null;
            var provider = queryable.Provider as DefaultQueryProvider;
            if (provider == null) return null;

            var propertyInfo = typeof(DefaultQueryProvider).GetProperty("Session", BindingFlags.NonPublic | BindingFlags.Instance);
            var result = propertyInfo.GetValue(provider);
            var isession = result as ISession;
            if (isession != null) this.session = isession;
            return session;
        }

        /// <summary>
        /// Perform the lazy loading allowed in the expandMap.
        /// </summary>
        /// <param name="list"></param>
        public override IEnumerable PostExecuteQuery(IEnumerable list)
        {
            NHInitializer.InitializeList(list, expandMap);
            return list;
        }

        /// <summary>
        /// Configure the JsonFormatter to limit the object serialization of the response.
        /// Even with no IQueryable, we still need to configure the formatter to prevent runaway serialization.
        /// We have to rely on the controller to close the session in this case.
        /// </summary>
        /// <param name="jsonFormatter"></param>
        /// <param name="queryable">Used to obtain the ISession</param>
        public override void ConfigureFormatter(JsonMediaTypeFormatter jsonFormatter, IQueryable queryable)
        {
            ConfigureFormatter(jsonFormatter, GetSession(queryable));
        }

        /// <summary>
        /// Configure the JsonFormatter to limit the object serialization of the response.
        /// </summary>
        /// <param name="jsonFormatter">request.GetConfiguration().Formatters.JsonFormatter</param>
        /// <param name="session">If not null, will be closed by this method.  Otherwise, the session must be closed by the Controller.</param>
        private void ConfigureFormatter(JsonMediaTypeFormatter jsonFormatter, ISession session)
        {
            var settings = jsonFormatter.SerializerSettings;

            if (session != null)
            {
                // Only serialize the properties that were initialized before session was closed
                if (session.IsOpen) session.Close();
                settings.ContractResolver = NHibernateContractResolver.Instance;
            }
            else if (expandMap.map.Count > 0)
            {
                // Limit serialization by only allowing properties in the map
                settings.ContractResolver = new IncludingContractResolver(expandMap.map);
            }

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
        /// Release any resources associated with this QueryHelper.
        /// </summary>
        /// <param name="responseObject">Response payload, which may have associated resources.</param>
        public override void Close(object responseObject)
        {
            session = GetSession(responseObject as IQueryable);
            if (session != null)
            {
                if (session.IsOpen) session.Close();
            }
        }

    }
}
