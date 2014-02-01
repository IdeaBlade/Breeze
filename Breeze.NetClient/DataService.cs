using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public class DataService : IJsonSerializable {

    public DataService(String serviceName) {
      ServiceName = serviceName;
      _client = new HttpClient();
      _client.BaseAddress = new Uri(serviceName);

      // Add an Accept header for JSON format.
      _client.DefaultRequestHeaders.Accept.Add(
          new MediaTypeWithQualityHeaderValue("application/json"));
      HasServerMetadata = true;
      UseJsonP = false;
    }

    public String ServiceName {get; private set; }

    public bool UseJsonP { get; set; }

    public bool HasServerMetadata { get; set; }

    public DataServiceAdapter Adapter { get; set; }

    public JsonResultsAdapter JsonResultsAdapter { get; set; }

    // Only available for server retrieved metadata
    public String ServerMetadata { get; internal set; }

    public async Task<String> GetAsync(String resourcePath) {
      try {

        var response = await _client.GetAsync(resourcePath);
        response.EnsureSuccessStatusCode(); // Throw on error code.

        var result = await response.Content.ReadAsStringAsync();
        return result;
      } catch (HttpRequestException ex) {
        throw;
      } catch (Exception e) {
        throw;
      } finally {

      }
    }

    JObject IJsonSerializable.ToJObject() {
      var jo = new JObject();
      jo.AddProperty("serviceName", this.ServiceName);
      jo.AddProperty("adapterName", this.Adapter == null ? null : this.Adapter.Name);
      jo.AddProperty("hasServerMetadata", this.HasServerMetadata);
      jo.AddProperty("jsonResultsAdapter", this.JsonResultsAdapter == null ? null : this.JsonResultsAdapter.Name);
      jo.AddProperty("useJsonp", this.UseJsonP);
      return jo;
    }

    object IJsonSerializable.FromJObject(JObject jObject) {
      throw new NotImplementedException();
    }

    private HttpClient _client;


  }
}
