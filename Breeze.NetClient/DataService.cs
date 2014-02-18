using System;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public class DataService : IJsonSerializable {

    public DataService() {

    }

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
        Debug.WriteLine(ex.Message);
        throw;
      } catch (Exception e) {
        Debug.WriteLine(e.Message);
        throw;
      } finally {

      }
    }

    JNode IJsonSerializable.ToJNode(Object config) {
      var jo = new JNode();
      jo.AddPrimitive("serviceName", this.ServiceName);
      jo.AddPrimitive("adapterName", this.Adapter == null ? null : this.Adapter.Name);
      jo.AddPrimitive("hasServerMetadata", this.HasServerMetadata);
      jo.AddPrimitive("jsonResultsAdapter", this.JsonResultsAdapter == null ? null : this.JsonResultsAdapter.Name);
      jo.AddPrimitive("useJsonp", this.UseJsonP);
      return jo;
    }

    void IJsonSerializable.FromJNode(JNode jNode) {
      ServiceName = jNode.Get<String>("serviceName");
      // Adapter = null;
      HasServerMetadata = jNode.Get<bool>("hasServerMetadata");
      // JsonResultsAdapter
      UseJsonP = jNode.Get<bool>("useJsonp");
    }

    private HttpClient _client;


  }
}
