using Breeze.ContextProvider;
using Breeze.WebApi2;
using Newtonsoft.Json;

namespace Sample_WebApi2 {
#if CustomConfig
  public class CustomBreezeConfig : BreezeConfig {

    /// <summary>
    /// Override to use a specialized JsonSerializer implementation.
    /// </summary>
    protected override JsonSerializerSettings CreateJsonSerializerSettings() {
      var baseSettings = base.CreateJsonSerializerSettings();
      // baseSettings.DateTimeZoneHandling = DateTimeZoneHandling.Utc;
      baseSettings.DateParseHandling = DateParseHandling.None;
      return baseSettings;
    }

  }
#endif
}