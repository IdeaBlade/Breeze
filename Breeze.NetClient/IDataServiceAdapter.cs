using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {
  public interface IDataServiceAdapter {
    String Name { get; }
    Task<SaveResult> SaveChanges(EntityManager em, IEnumerable<IEntity> entitiesToSave, SaveOptions saveOptions);
  }
}
