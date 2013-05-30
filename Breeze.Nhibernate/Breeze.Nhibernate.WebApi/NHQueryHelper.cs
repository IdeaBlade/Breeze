using Breeze.WebApi;
using Newtonsoft.Json;
using NHibernate;
using NHibernate.Linq;
using System;
using System.Collections;
using System.Linq;
using System.Net.Http.Formatting;
using System.Reflection;
using System.Web.Http.OData.Query;

namespace Breeze.Nhibernate.WebApi
{
    public class NHQueryHelper : QueryHelper
    {
        protected ExpandTypeMap expandMap = new ExpandTypeMap();

        public NHQueryHelper(bool enableConstantParameterization, bool ensureStableOrdering, HandleNullPropagationOption handleNullPropagation, int pageSize)
            : base(enableConstantParameterization, ensureStableOrdering, handleNullPropagation, pageSize)
        {
        }

        /// <summary>
        /// Performs expands based on the list of strings in queryable.GetIncludes().
        /// Also populates the ExpandTypeMap that controls lazy initialization and serialization.
        /// </summary>
        /// <param name="queryable"></param>
        /// <returns></returns>
        public IQueryable ApplyExpand(IQueryableInclude queryable)
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
        public override IQueryable ApplyExpand(IQueryable queryable, string expandsQueryString)
        {
            if (string.IsNullOrWhiteSpace(expandsQueryString)) return queryable;
            var session = GetSession(queryable);
            var fetcher = new NHEagerFetch(session.SessionFactory);
            queryable = fetcher.ApplyExpansions(queryable, expandsQueryString, expandMap);

            return queryable;
        }

        /// <summary>
        /// Get the ISession from the IQueryable.
        /// </summary>
        /// <param name="queryable"></param>
        /// <returns>the session if queryable.Provider is NHibernate.Linq.DefaultQueryProvider, else null</returns>
        public static ISession GetSession(IQueryable queryable)
        {
            if (queryable == null) return null;
            var provider = queryable.Provider as DefaultQueryProvider;
            if (provider == null) return null;

            var propertyInfo = typeof(DefaultQueryProvider).GetProperty("Session", BindingFlags.NonPublic | BindingFlags.Instance);
            var result = propertyInfo.GetValue(provider);
            var session = result as ISession;
            return session;
        }

        /// <summary>
        /// Perform the lazy loading allowed in the expandMap.
        /// </summary>
        /// <param name="list"></param>
        public void InitializeProxies(IEnumerable list)
        {
            NHInitializer.InitializeList(list, expandMap);
        }

        /// <summary>
        /// Configure the JsonFormatter to limit the object serialization of the response.
        /// </summary>
        /// <param name="jsonFormatter"></param>
        /// <param name="queryable">Used to obtain the ISession</param>
        public void ConfigureFormatter(JsonMediaTypeFormatter jsonFormatter, IQueryable queryable)
        {
            ConfigureFormatter(jsonFormatter, GetSession(queryable));
        }

        /// <summary>
        /// Configure the JsonFormatter to limit the object serialization of the response.
        /// </summary>
        /// <param name="jsonFormatter">request.GetConfiguration().Formatters.JsonFormatter</param>
        /// <param name="session">If not null, will be closed by this method.</param>
        private void ConfigureFormatter(JsonMediaTypeFormatter jsonFormatter, ISession session)
        {
            var settings = jsonFormatter.SerializerSettings;
            settings.Formatting = Formatting.Indented;  // TODO debug only - makes the payload larger

            if (session != null)
            {
                // Only serialize the properties that were initialized before session was closed
                if (session.IsOpen) session.Close();
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


    }
}
