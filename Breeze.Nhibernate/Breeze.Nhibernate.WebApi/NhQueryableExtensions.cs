using NHibernate.Linq;
using System.Collections.Generic;
using System.Linq;


namespace Breeze.Nhibernate.WebApi
{
    /// <summary>
    /// Support adding .Include to NhQueryable queries.
    /// </summary>
    public static class NhQueryableExtensions
    {
        // Hack to remember which paths are included for the given query
        private static IDictionary<IQueryable, List<string>> queryIncludes = new Dictionary<IQueryable, List<string>>();

        public static List<string> GetIncludes(IQueryable queryable)
        {
            List<string> list;
            queryIncludes.TryGetValue(queryable, out list);
            return list;
        }

        // Clean up the includes after they're no longer needed
        public static void RemoveIncludes(IQueryable queryable)
        {
            queryIncludes.Remove(queryable);
        }

        /// <summary>
        /// Extension to allow Include clauses to be added to NhQueryable objects.
        /// </summary><example>
        /// var query = new NhQueryable<Customer>(session.GetSessionImplementation());
        /// query = query.Include("Orders");
        /// </example>
        /// <typeparam name="T"></typeparam>
        /// <param name="queryable"></param>
        /// <param name="propertyPath"></param>
        /// <returns></returns>
        public static NhQueryable<T> Include<T>(this NhQueryable<T> queryable, string propertyPath)
        {
            List<string> list;
            if (!queryIncludes.TryGetValue(queryable, out list))
            {
                list = new List<string>();
                queryIncludes.Add(queryable, list);
            }
            list.Add(propertyPath);

            return queryable;
        }
    }
}
