using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public class NamingConvention {
    public NamingConvention(String name) {
      Name = name;
    }
    public String Name { get; protected set; }
    public virtual String ServerPropertyNameToClient(String clientName) {
      return clientName;
    }
    public virtual String ClientPropertyNameToServer(String serverName) {
      return serverName;
    }
    public static NamingConvention Default = new NamingConvention("Default");
    public static NamingConvention CamelCase = new CamelCaseNamingConvention();

    public String Test(String testVal, bool toServer) {
      Func<String, String> fn1;
      Func<String, String> fn2;
      if (toServer) {
        fn1 = ClientPropertyNameToServer;
        fn2 = ServerPropertyNameToClient;
      } else {
        fn1 = ServerPropertyNameToClient;
        fn2 = ClientPropertyNameToServer;
      }
      var t1 = fn1(testVal);
      var t2 = fn2(t1);
      if (t2 != testVal) {
        throw new Exception("NamingConvention: " + this.Name + " does not roundtrip the following value correctly: " + testVal);
      }
      return t1;
    }
  }

  public class CamelCaseNamingConvention : NamingConvention  {
    public CamelCaseNamingConvention()
      : base("CamelCase") {

    }
    
    public override String ServerPropertyNameToClient(String serverName) {
      return serverName.Substring(0,1).ToLower() + serverName.Substring(1);
    }
    public override String ClientPropertyNameToServer(String clientName) {
      return clientName.Substring(0, 1).ToUpper() + clientName.Substring(1);
    }
  }
}
