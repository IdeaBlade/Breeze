
namespace Breeze.NetClient {
  public class QueryOptions {
    public QueryOptions() {

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
    public MergeStrategy MergeStrategy { get; set; }
  }
}
