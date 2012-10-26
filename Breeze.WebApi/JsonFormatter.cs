using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http.Formatting;
using System.Net.Http.Headers;
using System.Runtime.Serialization.Formatters;
using System.Text;
using System.Web.Http.Controllers;
using Newtonsoft.Json;

namespace Breeze.WebApi {

  public class JsonFormatter {

    public static JsonMediaTypeFormatter Create() {
      var jsonSerializerSettings = new JsonSerializerSettings() {
        NullValueHandling = NullValueHandling.Ignore,
        PreserveReferencesHandling = PreserveReferencesHandling.Objects,
        ReferenceLoopHandling = ReferenceLoopHandling.Ignore,
        TypeNameHandling = TypeNameHandling.Objects,
        TypeNameAssemblyFormat = FormatterAssemblyStyle.Simple
      };
      var formatter = new JsonMediaTypeFormatter();
      formatter.SerializerSettings = jsonSerializerSettings;
      formatter.SupportedMediaTypes.Add(new MediaTypeHeaderValue("application/json"));
      formatter.SupportedEncodings.Add(new UTF8Encoding(false, true));
      return formatter;

    }
  }

  /// <summary>
  /// Establish a JsonFormatter configured for Breeze controllers
  /// </summary>
  /// <remarks>
  /// The Breeze JsonFormatter is the same Newtonsoft-based JsonFormatter
  /// shipped in the ASP.NET Web Api, 
  /// configured specifically for Breeze controllers.
  /// </remarks>
  public class JsonFormatterAttribute : Attribute, IControllerConfiguration {
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


}
