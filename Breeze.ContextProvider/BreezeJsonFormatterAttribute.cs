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
