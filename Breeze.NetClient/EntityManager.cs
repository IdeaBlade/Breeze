using Breeze.Metadata;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public class EntityManager {

    /// <summary>
    /// 
    /// </summary>
    /// <param name="serviceName">"http://localhost:9000/"</param>
    public EntityManager(String serviceName, MetadataStore metadataStore=null) {
      DefaultDataService = new DataService(serviceName);
      MetadataStore = metadataStore != null ? metadataStore : new MetadataStore();
      JsonConverter = new JsonEntityConverter(MetadataStore);
    }

    public EntityManager(EntityManager em) {
      MetadataStore = em.MetadataStore;
      DefaultDataService = em.DefaultDataService;
      JsonConverter = em.JsonConverter;
    }

    public DataService DefaultDataService { get; private set; }

    public MetadataStore MetadataStore { get; private set; }

    public JsonConverter JsonConverter { get; private set; }

    public async Task<String> FetchMetadata(DataService dataService = null) {
      dataService = dataService != null ? dataService : this.DefaultDataService;
      var metadata = await MetadataStore.FetchMetadata(dataService);
      return metadata;
    }

    public async Task<IEnumerable<T>> ExecuteQuery<T>(EntityQuery<T> query) {
      var dataService = query.DataService != null ? query.DataService : this.DefaultDataService;
      await FetchMetadata(dataService);
      var resourcePath = query.GetResourcePath();
      // HACK
      resourcePath = resourcePath.Replace("/*", "");
      var result = await dataService.GetAsync(resourcePath);

      if (resourcePath.Contains("inlinecount")) {
        return JsonConvert.DeserializeObject<QueryResult<T>>(result, JsonConverter);
      } else {
        return JsonConvert.DeserializeObject<IEnumerable<T>>(result, JsonConverter);
      }
       
    }

    ///// <summary>
    ///// 
    ///// </summary>
    ///// <param name="webApiQuery">"api/products"</param>
    //public async Task<Object> ExecuteQuery(string resourcePath) {
    // }


  }

  // JsonObject attribute is needed so this is NOT deserialized as an Enumerable
  [JsonObject]
  public class QueryResult<T> : IEnumerable<T>, IHasInlineCount  {
    public IEnumerable<T> Results { get; set; }
    public Int64? InlineCount { get; set; }
    public IEnumerator<T> GetEnumerator() {
      return Results.GetEnumerator();
    }

    System.Collections.IEnumerator System.Collections.IEnumerable.GetEnumerator() {
      return Results.GetEnumerator();
    }
    
  }

  public interface IHasInlineCount {
    Int64? InlineCount { get; }
  }

  
}



