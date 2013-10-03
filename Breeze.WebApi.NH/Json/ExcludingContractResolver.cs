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
    /// Newtonsoft.Json ContractResolver that can be configured to exclude certain properties by name.
    /// Allows JSON serializer to skip certain properties, thus preventing the serializer from trying to 
    /// serialize the entire object graph.
    /// </summary>
    public class ExcludingContractResolver : DefaultContractResolver
    {
        private List<string> excludedMemberNames;

        /// <summary>
        /// Define the properties that should be excluded.  Two different methods can be used: 
        /// 1. The simple property name, e.g. "Orders".  This will exclude properties with that name from anywhere in the object graph.
        /// 2. The declaring type name + '.' + property name, e.g. "Customer.Orders".  This will exclude the property name from that type only.
        /// </summary>
        /// <param name="excludedMembers"></param>
        public ExcludingContractResolver(string[] excludedMembers)
        {
            excludedMemberNames = excludedMembers.ToList();
        }

        protected override List<MemberInfo> GetSerializableMembers(Type objectType)
        {
            var members = base.GetSerializableMembers(objectType);

            members.RemoveAll(memberInfo => excludedMemberNames.Contains(memberInfo.Name));
            members.RemoveAll(memberInfo => excludedMemberNames.Contains(memberInfo.DeclaringType.Name + '.' + memberInfo.Name));

            return members;
        }

    }
}