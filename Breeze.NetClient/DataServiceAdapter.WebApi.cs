using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public class WebApiDataServiceAdapter : IDataServiceAdapter {

    public String Name {
      get { return "WebApi"; }
    }

    public Task<SaveResult> SaveChanges(EntityManager em, IEnumerable<IEntity> entitiesToSave, SaveOptions saveOptions) {
      throw new NotImplementedException();
    }
  }
}
