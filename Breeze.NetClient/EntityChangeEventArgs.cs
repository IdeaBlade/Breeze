
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.NetClient {

  #region EntityChange base classes

  /// <summary>
  /// Base class for all Entity/EntityProperty Changing/Changed event args.
  /// </summary>
  public abstract class EntityChangeEventArgs : EventArgs {

    /// <summary>
    /// Create an instance of this class.
    /// </summary>
    /// <param name="entityAspect"></param>
    protected EntityChangeEventArgs(EntityAspect entityAspect)
      : base() {
      EntityAspect = entityAspect;
    }

    /// <summary>
    /// Returns the EntityAspect for the entity involved in the event.
    /// </summary>
    public EntityAspect EntityAspect {
      get;
      private set;
    }

    /// <summary>
    ///  The object that is changing or has been changed.
    /// </summary>
    public object Entity {
      get { return EntityAspect.Entity; }
    }


   

  }

  /// <summary>
  ///  Base class for all Entity/EntityProperty Changing EventArgs.
  /// </summary>
  public abstract class EntityChangeCancelEventArgs : EntityChangeEventArgs {

    /// <summary>
    /// 
    /// </summary>
    /// <param name="entityAspect"></param>
    protected EntityChangeCancelEventArgs(EntityAspect entityAspect)
      : base(entityAspect) {
    }

    /// <summary>
    /// Gets or sets a value indicating whether the event should be canceled.
    /// </summary>
    /// <value>True if the event should be canceled; otherwise, False.</value>
    public bool Cancel { get; set; }

  }

  #endregion

  #region EntityPropertyChangingEventArgs
  /// <summary>
  /// Provides information to the <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityPropertyChanging"/> event.
  /// </summary>
  /// <remarks>
  /// The <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityPropertyChanging"/> event fires whenever a property
  /// setter is called on an entity in your model before the new value is set.
  /// You can set the <see cref="P:IdeaBlade.EntityModel.EntityPropertyChangingEventArgs.Cancel"/> property to true in your handler to stop further 
  /// processing of the change.  
  /// </remarks>
  public class EntityPropertyChangingEventArgs : EntityChangeCancelEventArgs {

    /// <summary>
    /// Ctor.
    /// </summary>
    /// <param name="entityAspect"></param>
    /// <param name="property"></param>
    /// <param name="value"></param>
    public EntityPropertyChangingEventArgs(EntityAspect entityAspect, EntityProperty property, object value)
      : base(entityAspect) {
      ProposedValueParent = entityAspect;
      Property = property;
      ProposedValueProperty = property;
      ProposedValue = value;
      Cancel = false;
    }

    /// <summary>
    /// Ctor.
    /// </summary>
    /// <param name="topLevelAspect"></param>
    /// <param name="topLevelProperty"></param>
    /// <param name="proposedValueParent"></param>
    /// <param name="proposedValueProperty"></param>
    /// <param name="value"></param>
    public EntityPropertyChangingEventArgs(EntityAspect topLevelAspect, EntityProperty topLevelProperty, Object proposedValueParent, EntityProperty proposedValueProperty, object value)
      : base(topLevelAspect) {
      ProposedValueParent = ProposedValueParent;
      Property = topLevelProperty;
      ProposedValueProperty = proposedValueProperty;
      ProposedValue = value;
      Cancel = false;
    }

    /// <summary>
    /// Property that is changing.
    /// </summary>
    public EntityProperty Property { get; private set; }

    /// <summary>
    /// The local parent object ( may be a complex object) containing the property being changed.
    /// </summary>
    public Object ProposedValueParent { get; private set; }

    /// <summary>
    /// The local parent property that is actually being changed. Will be different from <see cref="Property"/> when a complex object is involved.
    /// </summary>
    public EntityProperty ProposedValueProperty { get; private set; }

    /// <summary>
    /// Gets or sets the proposed value of the property that is changing.
    /// </summary>
    public object ProposedValue { get; set; }

  }
  #endregion

  #region EntityPropertyChangedEventArgs
  /// <summary>
  /// Provides information to the <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityPropertyChanged"/> event.
  /// </summary>
  /// <remarks>
  /// The <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityPropertyChanged"/> event fires whenever a property
  /// setter is called on an entity in your model after the new value is set.
  /// </remarks>
  public class EntityPropertyChangedEventArgs : EntityChangeEventArgs {
    /// <summary>
    /// Public ctor.
    /// </summary>
    /// <param name="entityAspect"></param>
    /// <param name="property"></param>
    /// <param name="newValue"></param>
    public EntityPropertyChangedEventArgs(EntityAspect entityAspect, EntityProperty property, object newValue)
      : base(entityAspect) {
      NewValueParent = entityAspect;
      Property = property;
      NewValueProperty = property;
      NewValue = newValue;
    }

    /// <summary>
    /// Ctor.
    /// </summary>
    /// <param name="topLevelAspect"></param>
    /// <param name="topLevelProperty"></param>
    /// <param name="newValueParent"></param>
    /// <param name="newValueProperty"></param>
    /// <param name="value"></param>
    public EntityPropertyChangedEventArgs(EntityAspect topLevelAspect, EntityProperty topLevelProperty, Object newValueParent, EntityProperty newValueProperty, object value)
      : base(topLevelAspect) {
      NewValueParent = newValueParent;
      Property = topLevelProperty;
      NewValueProperty = newValueProperty;
      NewValue = value;

    }

    /// <summary>
    /// Property whose value has changed.
    /// </summary>
    public EntityProperty Property { get; private set; }

    /// <summary>
    /// For complex objects this is the local complex object property that changed. 
    /// </summary>
    public EntityProperty NewValueProperty { get; private set; }

    /// <summary>
    /// For changes to complex objects this is the local Complex Object that changed.
    /// </summary>
    public Object NewValueParent { get; private set; }

    /// <summary>
    /// The value that was just set.
    /// </summary>
    public object NewValue { get; set; }

  }
  #endregion

  #region EntityChangingEventArgs
  /// <summary>
  /// Provides information to the <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanging"/> event.
  /// </summary>
  /// <remarks>
  /// The <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanging"/> event fires whenever an action
  /// is about to take place on an entity.
  /// You can set the <see cref="P:IdeaBlade.EntityModel.EntityChangingEventArgs.Cancel"/> property to true in your handler to stop further 
  /// processing of the change.  See the <see cref="EntityAction"/> for the action to
  /// be performed.
  /// </remarks>
  public class EntityChangingEventArgs : EntityChangeCancelEventArgs {

    /// <summary>
    /// Ctor.
    /// </summary>
    /// <param name="entityAspect"></param>
    /// <param name="action"></param>
    public EntityChangingEventArgs(EntityAspect entityAspect, EntityAction action)
      : base(entityAspect) {
      Action = action;
      Cancel = false;
    }

    /// <summary>
    /// Action that caused this change.
    /// </summary>
    public EntityAction Action { get; private set; }

  }
  #endregion

  #region EntityChangedEventArgs
  /// <summary>
  /// Provides information to the <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanged"/> event.
  /// </summary>
  /// <remarks>
  /// The <see cref="E:IdeaBlade.EntityModel.EntityGroup.EntityChanged"/> event fires whenever an action
  /// has taken place on an entity. See the <see cref="EntityAction"/> for the action performed.
  /// </remarks>
  public class EntityChangedEventArgs : EntityChangeEventArgs {

    /// <summary>
    /// Ctor.
    /// </summary>
    /// <param name="entityAspect"></param>
    /// <param name="action"></param>
    public EntityChangedEventArgs(EntityAspect entityAspect, EntityAction action)
      : base(entityAspect) {
      Action = action;
    }

    /// <summary>
    /// Action that caused this change.
    /// </summary>
    public EntityAction Action { get; private set; }

  }
  #endregion
}
