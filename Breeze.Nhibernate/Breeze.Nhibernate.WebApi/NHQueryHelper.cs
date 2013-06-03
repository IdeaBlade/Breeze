using Breeze.WebApi;
using Newtonsoft.Json;
using NHibernate;
using NHibernate.Linq;
using System;
using System.Collections;
using System.Collections.Specialized;
using System.Linq;
using System.Net.Http.Formatting;
using System.Reflection;
using System.Web.Http.OData.Query;
using System.Net.Http;

namespace Breeze.Nhibernate.WebApi
{
    public class NHQueryHelper : QueryHelper
    {
        protected ExpandTypeMap expandMap = new ExpandTypeMap();
        protected ISession session;

        public NHQueryHelper(bool enableConstantParameterization, bool ensureStableOrdering, HandleNullPropagationOption handleNullPropagation, int pageSize)
            : base(enableConstantParameterization, ensureStableOrdering, handleNullPropagation, pageSize)
        {
        }

        public override IQueryable BeforeApplyQuery(IQueryable queryable, ODataQueryOptions queryOptions)
        {
            GetSession(queryable);
            var nhQueryable = queryable as IQueryableInclude;
            if (nhQueryable != null)
            {
                queryable = ApplyExpand(nhQueryable);
            }
            return queryable;
        }

        /// <summary>
        /// Apply the $select and $expand clauses to the queryable.
        /// Overrides the base class method to handle the includes of an IQueryableInclude
        /// </summary>
        /// <param name="queryable"></param>
        /// <param name="map">From request.RequestUri.ParseQueryString(); contains $select or $expand</param>
        /// <returns></returns>
        /// <exception>Use of both 'expand' and 'select' in the same query is not currently supported</exception>
        //public override IEnumerable ApplySelectAndExpand(IQueryable queryable, NameValueCollection map)
        //{
        //    var result = base.ApplySelectAndExpand(queryable, map);
        //    if (result == null)
        //    {
        //        // query was not executed by base, so we need to do it here
        //        result = Enumerable.ToList((dynamic)queryable);
        //    }
        //    InitializeProxies(result);
        //    return result;
        //}

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

        //public override void WrapResult(HttpRequestMessage request, HttpResponseMessage response, object responseObject, object queryResult)
        //{
        //    var numer = responseObject as IEnumerable;
        //    if (numer != null)
        //        InitializeProxies(numer);
        //    base.WrapResult(request, response, responseObject, queryResult);
        //}
    }
}
