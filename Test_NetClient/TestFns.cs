using Breeze.NetClient;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Threading;

namespace Test_NetClient {
  public static class TestFns {

    public static void RunInWpfSyncContext(Func<Task> function) {
      if (function == null) throw new ArgumentNullException("function");
      var prevCtx = SynchronizationContext.Current;
      try {
        var syncCtx = new DispatcherSynchronizationContext();
        SynchronizationContext.SetSynchronizationContext(syncCtx);

        var task = function();
        if (task == null) throw new InvalidOperationException();

        var frame = new DispatcherFrame();
        var t2 = task.ContinueWith(x => { frame.Continue = false; }, TaskScheduler.Default);
        Dispatcher.PushFrame(frame);   // execute all tasks until frame.Continue == false

        task.GetAwaiter().GetResult(); // rethrow exception when task has failed 
      } finally {
        SynchronizationContext.SetSynchronizationContext(prevCtx);
      }
    }

    public static async Task<EntityManager> NewEm(string serviceName) {
      if (MetadataStore.Instance.GetDataService(serviceName) == null) {
        var em = new EntityManager(serviceName);
        await em.FetchMetadata();
        return em;
      } else {
        return new EntityManager(serviceName);
      }
    }

    public static bool DEBUG_MONGO = false;
    public static bool DEBUG_ODATA = false;
    public static string EmployeeKeyName = "EmployeeID";
    public static string CustomerKeyName = "CustomerID";

    public static class WellKnownData {
      public static Guid AlfredsID = new Guid("785efa04-cbf2-4dd7-a7de-083ee17b6ad2");
      public static int NancyEmployeeID = 1;
      public static int ChaiProductID = 1;
      public static int DummyOrderID = 999;
      public static int DummyEmployeeID = 9999;
      public static Object[] AlfredsOrderDetailKey = new Object[] { 10643, 28 };
    }

    public static String MorphString(String val) {
      var suffix = "__";
      if (String.IsNullOrEmpty(val)) {
        return suffix;
      } else {
        if (val.EndsWith(suffix)) {
          val = val.Substring(0, val.Length - 2);
        } else {
          val = val + suffix;
        }
      }
      return val;
    }

    private static String Revese(String s) {
      var charArray = s.ToCharArray();
      Array.Reverse(charArray);
      return new string(charArray);
    }

    public static String RandomSuffix(int length) {
      // length should be less <= 18
      var suffix = DateTime.Now.Ticks.ToString().Reverse().Take(length).ToArray();
      return new string(suffix);
    }
  }
}
