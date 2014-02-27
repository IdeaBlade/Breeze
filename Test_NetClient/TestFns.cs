using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Test_NetClient {
  public static class TestFns {
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
  }
}
