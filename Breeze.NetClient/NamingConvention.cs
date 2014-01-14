using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Metadata {
  public class NamingConvention {
    public virtual String ServerPropertyNameToClient(String clientName) {
      return clientName;
    }
    public virtual String ClientPropertyNameToServer(String serverName) {
      return serverName;
    }
    public static NamingConvention Default = new NamingConvention();
    public static NamingConvention CamelCase = new CamelCaseNamingConvention();
  }

  public class CamelCaseNamingConvention : NamingConvention {
    public override String ServerPropertyNameToClient(String serverName) {
      return serverName.Substring(0,1).ToLower() + serverName.Substring(1);
    }
    public override String ClientPropertyNameToServer(String clientName) {
      return clientName.Substring(0, 1).ToUpper() + clientName.Substring(1);
    }
  }
}
