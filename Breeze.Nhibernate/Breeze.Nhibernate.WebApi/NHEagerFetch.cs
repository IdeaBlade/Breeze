using NHibernate;
using NHibernate.Linq;
using NHibernate.Metadata;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Breeze.Nhibernate.WebApi
{
    /// <summary>
    /// Converts OData-style $expand clauses into NHibernate Fetch commands.
    /// Adapted from NhQueryableEnumeratorAttribute.cs found in https://github.com/PeteGoo/NHibernate.QueryService
    /// </summary>
    public class NHEagerFetch
    {
        // Allow the NHContext to inject the sessionFactory here
        internal static ISessionFactory sessionFactory;

        public static IQueryable ApplyExpansions(IQueryable queryable, string[] expandPaths, IDictionary<Type, List<string>> expandMap = null)
        {
            return ApplyExpansions(queryable, expandPaths, sessionFactory, expandMap);
        }

        /// <summary>
        /// Add the Fetch clauses to the query according to the given expand paths
        /// </summary>
        /// <param name="queryable">The query to expand</param>
        /// <param name="expandPaths">The names of the properties to expand.  May include nested paths of the form "Property/SubProperty"</param>
        /// <param name="sessionFactory">Provides the NHibernate metadata for the classes</param>
        /// <param name="expandMap">If provided, will be populated with the names of the expanded properties for each type.</param>
        /// <returns></returns>
        public static IQueryable ApplyExpansions(IQueryable queryable, string[] expandPaths, ISessionFactory sessionFactory, IDictionary<Type, List<string>> expandMap = null)
        {
            if (queryable == null) throw new ArgumentException("Query cannot be null");

            var nHibQuery = queryable.Provider as DefaultQueryProvider;
            if (nHibQuery == null) throw new ArgumentException("Expansion only supported on INHibernateQueryable queries");

            if (!expandPaths.Any()) throw new ArgumentException("Expansion Paths cannot be null");

            var currentQueryable = queryable;
            foreach (string expand in expandPaths)
            {
                // We always start with the resulting element type
                var currentType = currentQueryable.ElementType;
                var isFirstFetch = true;
                foreach (string seg in expand.Split('/'))
                {
                    if (expandMap != null && !expandMap.ContainsKey(currentType))
                        expandMap.Add(currentType, new List<string>());

                    IClassMetadata metadata = sessionFactory.GetClassMetadata(currentType);
                    if (metadata == null)
                    {
                        throw new ArgumentException("Type '" + currentType + "' not recognized as a valid type for this Context");
                    }

                    // Gather information about the property
                    var propInfo = currentType.GetProperty(seg);

                    if (propInfo == null)
                    {
                        throw new ArgumentException("Type '" + currentType.Name + "' does not have property '" + seg + "'");
                    }
                    if (expandMap != null) expandMap[currentType].Add(seg);
                    var propType = propInfo.PropertyType;
                    var metaPropType = metadata.GetPropertyType(seg);

                    // When this is the first segment of a path, we have to use Fetch instead of ThenFetch
                    var propFetchFunctionName = (isFirstFetch ? "Fetch" : "ThenFetch");

                    // The delegateType is a type for the lambda creation to create the correct return value
                    System.Type delegateType;

                    if (metaPropType.IsCollectionType)
                    {
                        // We have to use "FetchMany" or "ThenFetchMany" when the target property is a collection
                        propFetchFunctionName += "Many";

                        // We only support IList<T> or something similar
                        propType = propType.GetGenericArguments().Single();
                        delegateType = typeof(Func<,>).MakeGenericType(currentType,
                                                                        typeof(IEnumerable<>).MakeGenericType(propType));
                    }
                    else
                    {
                        delegateType = typeof(Func<,>).MakeGenericType(currentType, propType);
                    }

                    // Get the correct extension method (Fetch, FetchMany, ThenFetch, or ThenFetchMany)
                    var fetchMethodInfo = typeof(EagerFetchingExtensionMethods).GetMethod(propFetchFunctionName,
                                                                                      BindingFlags.Static |
                                                                                      BindingFlags.Public |
                                                                                      BindingFlags.InvokeMethod);
                    var fetchMethodTypes = new List<System.Type>();
                    fetchMethodTypes.AddRange(currentQueryable.GetType().GetGenericArguments().Take(isFirstFetch ? 1 : 2));
                    fetchMethodTypes.Add(propType);
                    fetchMethodInfo = fetchMethodInfo.MakeGenericMethod(fetchMethodTypes.ToArray());

                    // Create an expression of type new delegateType(x => x.{seg.Name})
                    var exprParam = System.Linq.Expressions.Expression.Parameter(currentType, "x");
                    var exprProp = System.Linq.Expressions.Expression.Property(exprParam, seg);
                    var exprLambda = System.Linq.Expressions.Expression.Lambda(delegateType, exprProp,
                                                                               new System.Linq.Expressions.
                                                                                   ParameterExpression[] { exprParam });

                    // Call the *Fetch* function
                    var args = new object[] { currentQueryable, exprLambda };
                    currentQueryable = (IQueryable)fetchMethodInfo.Invoke(null, args) as IQueryable;

                    currentType = propType;
                    isFirstFetch = false;
                }
            }

            return currentQueryable;
        }

        /// <summary>
        /// Add the Fetch clauses to the query according to the given expand paths, using the ICriteria API
        /// </summary>
        /// <param name="criteria">The query to expand</param>
        /// <param name="expandPaths">The names of the properties to expand.  May include nested paths of the form "Property/SubProperty"</param>
        /// <param name="sessionFactory">Provides the NHibernate metadata for the classes</param>
        /// <param name="expandMap">If provided, will be populated with the names of the expanded properties for each type.</param>
        /// <returns></returns>
        public static ICriteria ApplyExpansions(ICriteria criteria, string[] expandPaths, ISessionFactory sessionFactory, IDictionary<Type, List<string>> expandMap = null)
        {
            if (criteria == null) throw new ArgumentException("Criteria cannot be null");

            if (!expandPaths.Any()) throw new ArgumentException("Expansion Paths cannot be null");

            foreach (string expand in expandPaths)
            {
                // We always start with the resulting element type
                var currentType = criteria.GetRootEntityTypeIfAvailable();
                var dotpath = expand.Replace('/', '.');
                criteria.SetFetchMode(dotpath, FetchMode.Eager);
                
                // Add the types and properties to the expandMap so they will be serialized
                foreach (string seg in expand.Split('/'))
                {
                    if (expandMap != null && !expandMap.ContainsKey(currentType))
                        expandMap.Add(currentType, new List<string>());

                    IClassMetadata metadata = sessionFactory.GetClassMetadata(currentType);
                    if (metadata == null)
                    {
                        throw new ArgumentException("Type '" + currentType + "' not recognized as a valid type for this Context");
                    }

                    // Gather information about the property
                    var propInfo = currentType.GetProperty(seg);

                    if (propInfo == null)
                    {
                        throw new ArgumentException("Type '" + currentType.Name + "' does not have property '" + seg + "'");
                    }
                    if (expandMap != null) expandMap[currentType].Add(seg);
                    var propType = propInfo.PropertyType;

                    currentType = propType;
                }
            }

            return criteria;
        }

    }
}
