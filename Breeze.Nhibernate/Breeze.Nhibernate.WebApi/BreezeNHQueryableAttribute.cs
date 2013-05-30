using Breeze.WebApi;
using System;
using System.Collections;
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
        /// <summary>
        /// Sets HandleNullPropagation = false on the base class.  Otherwise it's true for non-EF, and that
        /// complicates the query expressions and breaks NH's query parser.
        /// </summary>
        public BreezeNHQueryableAttribute() : base()
        {
            base.HandleNullPropagation = HandleNullPropagationOption.False;
        }

        protected override QueryHelper NewQueryHelper()
        {
            return new NHQueryHelper(EnableConstantParameterization, EnsureStableOrdering, HandleNullPropagationOption.False, PageSize);
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

            var queryHelper = GetQueryHelper(actionExecutedContext.Request) as NHQueryHelper;
            IQueryable queryable = null;
            if (responseObject is IQueryable)
            {
                queryable = (IQueryable)responseObject;
                var nhQueryable = responseObject as IQueryableInclude;
                if (nhQueryable != null)
                {
                    queryHelper.ApplyExpand(nhQueryable);
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

                    queryHelper.InitializeProxies(list);

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
            // We have to rely on the controller to close the session in this case.
            var jsonFormatter = actionExecutedContext.Request.GetConfiguration().Formatters.JsonFormatter;
            queryHelper.ConfigureFormatter(jsonFormatter, queryable);
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
