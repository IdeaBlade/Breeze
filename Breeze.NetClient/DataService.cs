using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public class DataService {

    public DataService(String serviceName) {
      ServiceName = serviceName;
      _client = new HttpClient();
      _client.BaseAddress = new Uri(serviceName);

      // Add an Accept header for JSON format.
      _client.DefaultRequestHeaders.Accept.Add(
          new MediaTypeWithQualityHeaderValue("application/json"));
      
    }

    public String ServiceName {get; private set; }

    public async Task<String> GetAsync(String resourcePath) {
      try {

        var response = await _client.GetAsync(resourcePath);
        response.EnsureSuccessStatusCode(); // Throw on error code.

        var result = await response.Content.ReadAsStringAsync();
        return result;
      } catch (Newtonsoft.Json.JsonException jEx) {
        // This exception indicates a problem deserializing the request body.
        throw;
      } catch (HttpRequestException ex) {
        throw;
      } finally {

      }
    }

    

    HttpClient _client;
  }
}
