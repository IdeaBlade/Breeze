using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Configuration;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.Serialization.Formatters;
using System.Xml;
using System.Xml.Linq;
using Newtonsoft.Json;
using Newtonsoft.Json.Converters;
using Newtonsoft.Json.Linq;

namespace Breeze.WebApi {

  public class BreezeConfig {

    
    public static BreezeConfig Instance {
      get {
        lock (__lock) {
          if (__instance == null) {
            var typeCandidates = BreezeConfig.ProbeAssemblies.Value.SelectMany(a => a.GetTypes());
            var types = typeCandidates.Where(t => typeof (BreezeConfig).IsAssignableFrom(t) && !t.IsAbstract).ToList();

            if (types.Count == 0) {
              __instance = new BreezeConfig();
            } else if (types.Count == 1) {
              __instance = (BreezeConfig) Activator.CreateInstance(types[0]);
            } else {
              throw new Exception(
                "More than one BreezeConfig implementation was found in the currently loaded assemblies - limit is one.");
            }
          }
          return __instance;
        }
      }
    }

    public JsonSerializerSettings GetJsonSerializerSettings() {
      lock (__lock) {
        if (_jsonSerializerSettings == null) {
          _jsonSerializerSettings = CreateJsonSerializerSettings();
        }
        return _jsonSerializerSettings;
      }
    }

    /// <summary>
    /// Override to use a specialized JsonSerializer implementation.
    /// </summary>
    protected virtual JsonSerializerSettings CreateJsonSerializerSettings() {

      var jsonSerializerSettings = new JsonSerializerSettings() {
        NullValueHandling = NullValueHandling.Ignore,
        PreserveReferencesHandling = PreserveReferencesHandling.Objects,
        ReferenceLoopHandling = ReferenceLoopHandling.Ignore,
        TypeNameHandling = TypeNameHandling.Objects,
        TypeNameAssemblyFormat = FormatterAssemblyStyle.Simple,
      };

      // Default is DateTimeZoneHandling.RoundtripKind - you can change that here.
      // jsonSerializerSettings.DateTimeZoneHandling = DateTimeZoneHandling.Utc;

      // Hack is for the issue described in this post:
      // http://stackoverflow.com/questions/11789114/internet-explorer-json-net-javascript-date-and-milliseconds-issue
      jsonSerializerSettings.Converters.Add(new IsoDateTimeConverter {
        DateTimeFormat = "yyyy-MM-dd\\THH:mm:ss.fffK"
      });

      return jsonSerializerSettings;
    }


    // Cache the ProbeAssemblies.
    // Note: look at BuildManager.GetReferencedAssemblies if we start having
    // issues with Assemblies not yet having been loaded.
    public static Lazy<List<Assembly>> ProbeAssemblies = new Lazy<List<Assembly>>( () => 
      AppDomain.CurrentDomain.GetAssemblies().Where(a => !IsFrameworkAssembly(a)).ToList()
    );

    public static bool IsFrameworkAssembly(Assembly assembly) {
      var attrs = assembly.GetCustomAttributes(typeof(AssemblyProductAttribute), false).OfType<AssemblyProductAttribute>();
      var attr = attrs.FirstOrDefault();
      if (attr == null) {
        return false;
      }
      var productName = attr.Product;
      return FrameworkProductNames.Any(nm => productName.StartsWith(nm));
    }

    protected static readonly List<String> FrameworkProductNames = new List<String> {
      "Microsoft® .NET Framework",
      "Microsoft (R) Visual Studio (R) 2010",
      "Microsoft ASP.",
      "System.Net.Http",
      "Json.NET",
      "Irony",
      "Breeze.WebApi"
    };

    private static Object __lock = new Object();
    private static BreezeConfig __instance;
    
    private JsonSerializerSettings _jsonSerializerSettings = null;

  }
}