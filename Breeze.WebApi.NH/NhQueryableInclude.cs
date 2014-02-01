using NHibernate.Engine;
using NHibernate.Linq;
using System.Collections.Generic;
using System.Linq;
using System.Linq.Expressions;


namespace Breeze.WebApi.NH
{
    /// <summary>
    /// Extends NhQueryable to add an Include function.
    /// </summary>
    /// <typeparam name="T"></typeparam>
    public class NhQueryableInclude<T> : NhQueryable<T>, IQueryableInclude
    {
        private List<string> includes;

        /// <summary>
        /// Calls the base constructor, setting the Expression using NhQueryable.
        /// Needed because the NHibernate Linq parser chokes if NhQueryableInclude is in the expression.
        /// </summary>
        /// <param name="si"></param>
        public NhQueryableInclude(ISessionImplementor si)
            : base(new DefaultQueryProvider(si), Expression.Constant(new NhQueryable<T>(si).Cacheable<T>()))
        {}

        public NhQueryableInclude(IQueryProvider provider, Expression expr) : base(provider, expr)
        {}

        public IList<string> GetIncludes()
        {
            return includes;
        }

        /// <summary>
        /// Allows Include clauses to be added to NhQueryable objects.
        /// </summary><example>
        /// var query = new NhQueryableInclude<Customer>(session.GetSessionImplementation());
        /// query = query.Include("Orders");
        /// </example>
        /// <param name="propertyPath"></param>
        /// <returns></returns>
        public NhQueryableInclude<T> Include(string propertyPath)
        {
            if (includes == null) includes = new List<string>();
            includes.Add(propertyPath);

            return this;
        }

    }

    public interface IQueryableInclude : IQueryable
    {
        IList<string> GetIncludes();
    }
}
