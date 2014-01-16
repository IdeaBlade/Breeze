using NHibernate;
using NHibernate.Proxy;
using System;
using System.Collections;
using System.Collections.Generic;

namespace Breeze.WebApi.NH
{
    /// <summary>
    /// Initializes Hibernate proxies and collections prior to serialization.
    /// This is used to implement the OData $expand operation.
    /// 
    /// Be sure to set the default_batch_fetch_size property in your NH config file (or Web.config), e.g.
    /// <![CDATA[
    /// <property name="default_batch_fetch_size">32</property>
    /// ]]>
    /// so that lazy loading happens in batches, instead of one at a time.
    /// </summary>
    public class NHExpander
    {
        /// <summary>
        /// Cause initialization of properties on the objects in the collection.
        /// The properties to initialize are specified in the expandPaths.  For example,
        /// if roots is a collection of Orders, expandPaths might be 
        /// [ "Customer", "OrderDetails/Product/Supplier" ]
        /// </summary>
        /// <param name="roots">Collection of Hibernate-mapped objects</param>
        /// <param name="expandPaths">properties relative to the roots</param>
	    public static void InitializeList(IEnumerable roots, string[] expandPaths) 
        {
			List<string[]> paths = SplitPaths(expandPaths);
            foreach (var root in roots) 
            {
                foreach (var path in paths) 
                {
					InitializeObjectPath(root, path, 0);
				}
			}
	    }

        /// <summary>
        /// Recursively forces loading of each Hibernate proxy in the tree that matches an entry in the expandPath.
        /// </summary>
        /// <param name="parent">Top-level object containing the properties</param>
        /// <param name="expandPath">Path of properties to initialize for each type</param>
        /// <param name="pathIndex">Where we are in the path</param>
	    private static void InitializeObjectPath(object parent, string[] expandPath, int pathIndex)
        {
		    if (pathIndex >= expandPath.Length)
			    return;
		    string propName = expandPath[pathIndex];
		    Type type = parent.GetType();

            // Get the child object for the property name
            var propInfo = type.GetProperty(propName);
            if (propInfo == null)
            {
                throw new ArgumentException("Property " + propName + " not found on type " + type.Name);
            }
            var methInfo = propInfo.GetGetMethod();
            var child = methInfo.Invoke(parent, null);
    		pathIndex++;

            var collection = child as System.Collections.ICollection;
            if (collection != null)
            {
                System.Collections.IEnumerator iter = collection.GetEnumerator();
                while (iter.MoveNext())
                {
                    object current = iter.Current;
                    NHibernateUtil.Initialize(current);
				    if (pathIndex < expandPath.Length)
					    InitializeObjectPath(current, expandPath, pathIndex);
                }
            }
            else
            {
                NHibernateUtil.Initialize(child);
                var proxy = child as INHibernateProxy;
                if (proxy != null)
                {
                    child = proxy.HibernateLazyInitializer.GetImplementation();
                }

			    if (pathIndex < expandPath.Length)
				    InitializeObjectPath(child, expandPath, pathIndex);
            }
        
		}

        /// <summary>
        /// Split the strings into their path components.
        /// E.g. "OrderDetails/Product" becomes [ "OrderDetails", "Product" ]
        /// </summary>
        /// <param name="expandPaths"></param>
        /// <returns></returns>
        private static List<string[]> SplitPaths(string[] expandPaths) 
        {
            var delims = new char[] { '/', '.'};
		    List<string[]> paths = new List<string[]>();
            foreach (string expandPath in expandPaths) 
            {
                string[] propNames = expandPath.Split(delims);
                paths.Add(propNames);
            }
    		return paths;
		}
	}
}
