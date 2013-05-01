using Breeze.WebApi;
using System;
using System.Web.Http.Filters;

namespace Breeze.Nhibernate.WebApi
{
    /// <summary>
    /// Applies the BreezeNHQueryableAttribute to all controller methods that return IQueryable
    /// </summary>
    [AttributeUsage(AttributeTargets.Class)]
    public class BreezeNHControllerAttribute : BreezeControllerAttribute
    {
        internal BreezeQueryableAttribute nhFilter = new BreezeNHQueryableAttribute();
        protected override IFilterProvider GetQueryableFilterProvider(BreezeQueryableAttribute defaultFilter)
        {
            return base.GetQueryableFilterProvider(nhFilter);
        }
    }
}
