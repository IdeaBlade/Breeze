using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {

  public interface IStructuralAspect {

  }

  /// <summary>
  /// Interface implemented by entities and complex types.  Internal use only.
  /// </summary>
  public interface IStructuralObject : IEditableObject, IChangeTracking, IRevertibleChangeTracking, INotifyPropertyChanged,
    INotifyDataErrorInfo, IComparable {


    /// <summary>
    /// 
    /// </summary>
    /// <param name="property"></param>
    /// <param name="version"></param>
    /// <returns></returns>
    Object GetValueRaw(String propertyName);

    /// <summary>
    /// performs change notification
    /// </summary>
    /// <param name="property"></param>
    /// <param name="newValue"></param>
    void SetValue(String propertyName, Object newValue);

    /// <summary>
    /// 
    /// </summary>
    /// <param name="property"></param>
    /// <param name="newValue"></param>
    void SetValueRaw(String propertyName, object newValue);

    
    


  }

}
