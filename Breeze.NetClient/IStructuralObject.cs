using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {

  //public interface IStructuralAspect {
  //  StructuralType StructuralType;
  //}

  /// <summary>
  /// Interface implemented by entities and complex types.  Internal use only.
  /// </summary>
  public interface IStructuralObject : IEditableObject, IChangeTracking, IRevertibleChangeTracking, INotifyPropertyChanged,
    INotifyDataErrorInfo, IComparable {

    IDictionary<String, Object> BackingStore { get; set; }

  }

}
