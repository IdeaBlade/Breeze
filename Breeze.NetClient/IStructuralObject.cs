﻿using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {

  public interface IEntity : IStructuralObject, INotifyDataErrorInfo, INotifyPropertyChanged, IEditableObject, 
    IChangeTracking, IRevertibleChangeTracking, IComparable {
    EntityAspect EntityAspect { get; set; }
  }

  public interface IComplexObject : IStructuralObject, INotifyDataErrorInfo, IComparable {
    ComplexAspect ComplexAspect { get; set; }
  }

  /// <summary>
  /// Interface implemented by entities and complex types.  Internal use only.
  /// </summary>
  public interface IStructuralObject {

  }

}
