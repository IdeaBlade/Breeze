using System;
using System.Linq;
using System.Collections.Generic;
using System.Reflection;
using NHibernate.Proxy;
using Newtonsoft.Json;
using Newtonsoft.Json.Serialization;

namespace Breeze.WebApi.NH
{
    /// <summary>
    /// Newtonsoft.Json ContractResolver that only includes certain types from a given assembly.
    /// All other types from that assembly are excluded.  This allows control over which custom
    /// types are serialized.
    /// </summary>
    public class TypeContractResolver : DefaultContractResolver
    {
        private Assembly assembly;
        private HashSet<Type> includedTypes;

        /// <summary>
        /// Define included types.  All other types from the same assembly as the first type will be excluded.
        /// </summary>
        /// <param name="includedTypes"></param>
        public TypeContractResolver(params Type[] includedTypes)
        {
            if (!includedTypes.Any())
                this.assembly = typeof(TypeContractResolver).Assembly;
            else
                this.assembly = includedTypes.First().Assembly;

            this.includedTypes = new HashSet<Type>(includedTypes);
        }

        /// <summary>
        /// Define the assembly and the included types.  All other types from the assembly will be excluded.
        /// </summary>
        /// <param name="entityAssembly"></param>
        /// <param name="includedTypes"></param>
        public TypeContractResolver(Assembly entityAssembly, IEnumerable<Type> includedTypes)
        {
            this.assembly = entityAssembly;
            this.includedTypes = new HashSet<Type>(includedTypes);
        }

        protected override List<MemberInfo> GetSerializableMembers(Type objectType)
        {
            var members = base.GetSerializableMembers(objectType);

            var properties = members.OfType<PropertyInfo>().ToList();

            properties.RemoveAll(p => !IsIncluded(p.PropertyType));

            var fields = members.OfType<FieldInfo>().ToList();

            fields.RemoveAll(f => !IsIncluded(f.FieldType));

            members.Clear();
            members.AddRange(properties);
            members.AddRange(fields);

            return members;
        }

        protected bool IsIncluded(Type type)
        {
            // unwrap collections
            if (type.HasElementType) type = type.GetElementType();
            if (type.IsGenericType) type = type.GetGenericArguments()[0];

            if (includedTypes.Contains(type))
                return true;
            if (type.Assembly == assembly)
                return false;
            return true;
        }

    }
}