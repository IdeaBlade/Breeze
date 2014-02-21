
namespace Breeze.NetClient {
  public class QueryOptions : IJsonSerializable {

    public QueryOptions() {

    }
    
    public QueryOptions(JNode jNode) {
      FetchStrategy = jNode.GetNullableEnum<FetchStrategy>("fetchStrategy");
      MergeStrategy = jNode.GetNullableEnum<MergeStrategy>("mergeStrategy");
      
    }

    JNode IJsonSerializable.ToJNode(object config) {
      var jn = new JNode();
      jn.AddEnum("fetchStrategy", this.FetchStrategy );
      jn.AddEnum("mergeStrategy", this.MergeStrategy );
      return jn;
    }

    public QueryOptions(FetchStrategy fetchStrategy, MergeStrategy mergeStrategy) {
      FetchStrategy = fetchStrategy;
      MergeStrategy = mergeStrategy;
    }

    public static QueryOptions Default = new QueryOptions(Breeze.NetClient.FetchStrategy.FromServer, Breeze.NetClient.MergeStrategy.PreserveChanges);

    public FetchStrategy? FetchStrategy { get; internal set; }
    public MergeStrategy? MergeStrategy { get; internal set; }

    
  }

  public class ImportOptions {

    public ImportOptions(MergeStrategy? mergeStrategy = null) {
      MergeStrategy = mergeStrategy;
    }

    public static ImportOptions Default = new ImportOptions();
    public MergeStrategy? MergeStrategy { get; set; }
  }
}
