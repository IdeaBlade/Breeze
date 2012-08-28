namespace Todo {

    using System.Runtime.Serialization.Formatters;
    using System.Web.Http;
    using Newtonsoft.Json;
    using Newtonsoft.Json.Serialization; // for CamelCasePropertyNamesContractResolver

    public class FormatterConfig
    {
        public static void SetJsonFormatter()
        {
            // Configure json.net per the following post
            // http://www.asp.net/web-api/overview/formats-and-model-binding/json-and-xml-serialization            

            // Retrieve the JsonFormatter from the global configuration
            var formatter = GlobalConfiguration.Configuration.Formatters.JsonFormatter;

            var settings = formatter.SerializerSettings;
            settings.NullValueHandling = NullValueHandling.Ignore;
            settings.PreserveReferencesHandling = PreserveReferencesHandling.Objects;
            settings.ReferenceLoopHandling = ReferenceLoopHandling.Ignore;
            settings.TypeNameHandling = TypeNameHandling.Objects;
            settings.TypeNameAssemblyFormat = FormatterAssemblyStyle.Simple;

            // Configure to write JSON property names with camel casing
            // without changing our server-side data model.
            // TODO: Make this work for breeze; it doesn't right now
            //settings.ContractResolver = new CamelCasePropertyNamesContractResolver();
          
        }
    }
}