using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public class DataService : IJsonSerializable {

    public DataService() {

    }

    public DataService(JNode jNode) {
      ServiceName = jNode.Get<String>("serviceName");
      HasServerMetadata = jNode.Get<bool>("hasServerMetadata");
      // TODO: implement JsonResultsAdapter
      UseJsonP = jNode.Get<bool>("useJsonp");
      Adapter = GetAdapter(jNode.Get<String>("adapterName"));
    }

    private IDataServiceAdapter GetAdapter(string adapterName) {
      // TODO: fix this later using some form of DI
      return new WebApiDataServiceAdapter();
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
      Adapter = new WebApiDataServiceAdapter();
    }

    public String ServiceName {get; private set; }

    public bool UseJsonP { get; set; }

    public bool HasServerMetadata { get; set; }

    public IDataServiceAdapter Adapter { get; set; }

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

    public async Task<String> PostAsync(String resourcePath, String json) {

      try {
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        // example of how to use FormUrl instead.
        //var content = new FormUrlEncodedContent(new[] 
        //    {
        //        new KeyValuePair<string, string>("", "login")
        //    });

        var response = await _client.PostAsync(resourcePath, content);
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

 
    private HttpClient _client;


  }
}
