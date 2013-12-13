using Newtonsoft.Json.Serialization;
using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Reflection;

namespace Breeze.ContextProvider.NH
{
    /// <summary>
    /// Newtonsoft.Json ContractResolver that can be configured to include properties by name.
    /// Allows JSON serializer to skip certain properties, thus preventing the serializer from trying to 
    /// serialize the entire object graph.
    /// Serializes value types and System types by default, but excludes all collections and other
    /// types unless explicitly included.
    /// </summary>
    public class IncludingContractResolver : DefaultContractResolver
    {
        private HashSet<string> includedMembers;
        private IDictionary<Type, List<string>> includedTypeMembers;

        /// <summary>
        /// Configure the included property names using an array of strings
        /// </summary>
        /// <param name="includedMembers">Names of properties to be included</param>
        public IncludingContractResolver(params string[] includedMembers)
        {
            this.includedMembers = new HashSet<string>(includedMembers);
        }

        /// <summary>
        /// Configure the included property names using a dictionary of { Type -> List of property names to include }
        /// </summary>
        /// <param name="includedTypeMembers"></param>
        public IncludingContractResolver(IDictionary<Type, List<string>> includedTypeMembers)
        {
            this.includedTypeMembers = includedTypeMembers;
        }

        /// <summary>
        /// Returns the list of property and field names that should be serialized on a given type.
        /// </summary>
        /// <param name="objectType"></param>
        /// <returns></returns>
        protected override List<MemberInfo> GetSerializableMembers(Type objectType)
        {
            var members = base.GetSerializableMembers(objectType);

            var properties = members.OfType<PropertyInfo>().ToList();

            properties.RemoveAll(p => !IsIncluded(p.PropertyType, objectType, p.Name));

            var fields = members.OfType<FieldInfo>().ToList();

            fields.RemoveAll(f => !IsIncluded(f.FieldType, objectType, f.Name));

            members.Clear();
            members.AddRange(properties);
            members.AddRange(fields);

            return members;
        }

        /// <summary>
        /// For a given property type, containing type, and property name, return true if it should
        /// be serialized and false if not.  By default, value types and system types are serialized,
        /// but collections and custom types are not.
        /// </summary>
        /// <param name="propertyType"></param>
        /// <param name="containingType"></param>
        /// <param name="name"></param>
        /// <returns></returns>
        protected bool IsIncluded(Type propertyType, Type containingType, string name)
        {
            if (includedMembers != null && includedMembers.Contains(name)) return true;

            if (includedTypeMembers != null && includedTypeMembers.ContainsKey(containingType))
            {
                var list = includedTypeMembers[containingType];
                if (list.Contains(name)) return true;
            }


            if (propertyType.IsValueType || propertyType == typeof(string)) return true;

            // collections are excluded
            if (propertyType.HasElementType || typeof(IEnumerable).IsAssignableFrom(propertyType)) return false;

            // System types are included
            if (propertyType.Namespace.StartsWith("System")) return true;

            return false;
        }

    }
}