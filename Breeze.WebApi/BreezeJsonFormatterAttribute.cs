using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net.Http.Formatting;
using System.Net.Http.Headers;
using System.Runtime.Serialization.Formatters;
using System.Text;
using System.Web.Http.Controllers;
using System.Xml;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using System.Net.Http;

namespace Breeze.WebApi {

  public static class ContextProviderExtensions {
    public static HttpResponseMessage MetadataAsJson(this ContextProvider contextProvider) {
      var result = new HttpResponseMessage { Content = new StringContent( contextProvider.Metadata()) };
      result.Content.Headers.ContentType = new MediaTypeHeaderValue("application/json");
      return result;
    }
  }

  [Obsolete("Use BreezeJsonFormatterAttribute - will be removed afte June 1, 2013")]
  public class JsonFormatterAttribute : BreezeJsonFormatterAttribute {
    
  }

    

  /// <summary>
  /// Establish a JsonFormatter configured for Breeze controllers
  /// </summary> 
  /// <remarks>
  /// The Breeze JsonFormatter is the same Newtonsoft-based JsonFormatter
  /// shipped in the ASP.NET Web Api, 
  /// configured specifically for Breeze controllers.
  /// </remarks>
  public class BreezeJsonFormatterAttribute : Attribute, IControllerConfiguration {
    public void Initialize(
        HttpControllerSettings settings,
        HttpControllerDescriptor descriptor) {
      // Remove the existing JSON formatter. 
      var jsonFormatter = settings.Formatters.JsonFormatter;
      settings.Formatters.Remove(jsonFormatter);

      // Add the Web API Jsonformatter, configured for .NET 
      settings.Formatters.Add(JsonFormatter.Create());
    }
  }

  public class JsonFormatter {

    public static JsonMediaTypeFormatter Create() {
      var jsonSerializerSettings = BreezeConfig.Instance.GetJsonSerializerSettings();

      var formatter = new JsonMediaTypeFormatter();
      formatter.SerializerSettings = jsonSerializerSettings;
      formatter.SupportedMediaTypes.Add(new MediaTypeHeaderValue("application/json"));
      formatter.SupportedEncodings.Add(new UTF8Encoding(false, true));
      return formatter;

    }
  }


}
