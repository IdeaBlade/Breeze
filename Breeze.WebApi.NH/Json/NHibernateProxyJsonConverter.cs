using Newtonsoft.Json;
using NHibernate;
using NHibernate.Proxy;
using System;

namespace Breeze.WebApi.NH
{
    /// <summary>
    /// JsonConverter for handling NHibernate proxies.  
    /// Only serializes the object if it is initialized, i.e. the proxied object has been loaded.
    /// </summary>
    /// <see cref="http://james.newtonking.com/projects/json/help/html/T_Newtonsoft_Json_JsonConverter.htm"/>
    public class NHibernateProxyJsonConverter : JsonConverter
    {
        public override void WriteJson(JsonWriter writer, object value, JsonSerializer serializer)
        {
            if (NHibernateUtil.IsInitialized(value))
            {
                var proxy = value as INHibernateProxy;
                if (proxy != null)
                {
                    value = proxy.HibernateLazyInitializer.GetImplementation();
                }

                serializer.Serialize(writer, value);
            }
            else
            {
                serializer.Serialize(writer, null);
            }
        }

        public override object ReadJson(JsonReader reader, Type objectType, object existingValue, JsonSerializer serializer)
        {
            throw new NotImplementedException();
        }

        public override bool CanConvert(Type objectType)
        {
            return typeof(INHibernateProxy).IsAssignableFrom(objectType);
        }
    }
}
