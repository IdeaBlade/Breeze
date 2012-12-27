using Breeze.WebApi;
using Newtonsoft.Json;

namespace Sample_WebApi {

  public class CustomBreezeConfig : BreezeConfig {

    /// <summary>
    /// Override to use a specialized JsonSerializer implementation.
    /// </summary>
    protected override JsonSerializerSettings CreateJsonSerializerSettings() {
      var baseSettings = base.CreateJsonSerializerSettings();
      baseSettings.DateTimeZoneHandling = DateTimeZoneHandling.Utc;
      return baseSettings;
    }

  }
}