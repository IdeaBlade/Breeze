using Breeze.WebApi;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using System.Web.Http.Controllers;
using System.Web.Http.Filters;
using System.Web.Http.OData.Query;

namespace Breeze.WebApi.NH
{
    /// <summary>
    /// Applies the BreezeNHQueryableAttribute to all controller methods except those
    /// that already have a QueryableAttribute or an ODataQueryOptions parameter.
    /// </summary>
    [AttributeUsage(AttributeTargets.Class)]
    public class BreezeNHControllerAttribute : BreezeControllerAttribute
    {
        internal BreezeQueryableAttribute nhFilter = new BreezeNHQueryableAttribute();

        protected override IFilterProvider GetQueryableFilterProvider(BreezeQueryableAttribute defaultFilter)
        {
            return new BreezeNHQueryableFilterProvider(nhFilter);
        }

    }

    internal class BreezeNHQueryableFilterProvider : IFilterProvider
    {
        public BreezeNHQueryableFilterProvider(BreezeQueryableAttribute filter)
        {
            _filter = filter;
        }

        public IEnumerable<FilterInfo> GetFilters(HttpConfiguration configuration, HttpActionDescriptor actionDescriptor)
        {
            if (actionDescriptor == null ||
              actionDescriptor.GetCustomAttributes<QueryableAttribute>().Any() || // if method already has a QueryableAttribute (or subclass) then skip it.
              actionDescriptor.GetParameters().Any(parameter => typeof(ODataQueryOptions).IsAssignableFrom(parameter.ParameterType))
            )
            {
                return Enumerable.Empty<FilterInfo>();
            }

            return new[] { new FilterInfo(_filter, FilterScope.Global) };
        }

        private readonly BreezeQueryableAttribute _filter;
    }

}
