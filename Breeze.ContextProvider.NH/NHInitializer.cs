using NHibernate;
using NHibernate.Proxy;
using System;
using System.Collections;
using System.Collections.Generic;

namespace Breeze.ContextProvider.NH
{
    public class NHInitializer
    {
        /// <summary>
        /// Recursively forces loading of each NHibernate proxy in the tree that matches an entry in the map.
        /// </summary>
        /// <param name="list">Top-level collection of objects</param>
        /// <param name="expandMap">Properties to initialize for each type</param>
        public static void InitializeList<T>(IEnumerable<T> list, params string[] expandPaths)
        {
            var expandMap = NHEagerFetch.MapExpansions(typeof(T), expandPaths);

            var map = expandMap.map;
            var depth = expandMap.maxDepth;
            foreach (var el in list)
            {
                InitializeWithCascade(el, map, depth);
            }
        }

        
        /// <summary>
        /// Recursively forces loading of each NHibernate proxy in the tree that matches an entry in the map.
        /// </summary>
        /// <param name="list">Top-level collection of objects</param>
        /// <param name="expandMap">Properties to initialize for each type</param>
        public static void InitializeList(IEnumerable list, ExpandTypeMap expandMap)
        {
            if (expandMap == null) return;

            var map = expandMap.map;
            var depth = expandMap.maxDepth;
            foreach (var el in list)
            {
                InitializeWithCascade(el, map, depth);
            }
        }

        /// <summary>
        /// Recursively forces loading of each NHibernate proxy in the tree that matches an entry in the map.
        /// </summary>
        /// <param name="list">Top-level collection of objects</param>
        /// <param name="map">Map of properties to initialize for each type</param>
        /// <param name="remainingDepth">How deep to follow the tree; prevents infinite looping</param>
        public static void InitializeList(IEnumerable list, IDictionary<Type, List<String>> map, int remainingDepth)
        {
            foreach (var el in list)
            {
                InitializeWithCascade(el, map, remainingDepth);
            }
        }

        /// <summary>
        /// Recursively forces loading of each NHibernate proxy in the tree that matches an entry in the map.
        /// </summary>
        /// <param name="parent">Top-level object</param>
        /// <param name="map">Map of properties to initialize for each type</param>
        /// <param name="remainingDepth">How deep to follow the tree; prevents infinite looping</param>
        public static void InitializeWithCascade(object parent, IDictionary<Type, List<String>> map, int remainingDepth)
        {
            if (remainingDepth < 0 || parent == null) return;
            remainingDepth--;
            var type = parent.GetType();
            List<string> propNames;
            if (map.ContainsKey(type))
            {
                propNames = map[type];
            }
            else
            {
                if ((type.Name.StartsWith("<") || type.Name.StartsWith("_")) && map.ContainsKey(typeof(Type)))
                {
                    // anonymous type - get the values using "Type"
                    propNames = map[typeof(Type)];
                }
                else
                {
                    return;
                }
            }

            foreach (var name in propNames)
            {
                // Get the child object for the property name
                var propInfo = type.GetProperty(name);
                var methInfo = propInfo.GetGetMethod();
                var child = methInfo.Invoke(parent, null);

                var collection = child as System.Collections.ICollection;
                if (collection != null)
                {
                    System.Collections.IEnumerator iter = collection.GetEnumerator();
                    while (iter.MoveNext())
                    {
                        NHibernateUtil.Initialize(iter.Current);
                        InitializeWithCascade(iter.Current, map, remainingDepth);
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

                    InitializeWithCascade(child, map, remainingDepth);
                }
            }

        }
    }
}
