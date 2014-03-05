using System;


namespace Breeze.NetClient {
  // TODO: make immutable later
  public class ValidationOptions {
    public ValidationOptions() {
      ValidationContextFunc = (o) => new ValidationContext(o, null, null);
      ValidationApplicability = ValidationApplicability.Default;
      // ValidationNotificationMode = NetClient.ValidationNotificationMode.Notify;
    }
    public ValidationApplicability ValidationApplicability { get; set; }
    // public ValidationNotificationMode ValidationNotificationMode { get; set; }
    public Func<Object, ValidationContext> ValidationContextFunc { get; set; }

  }

  [Flags]
  public enum ValidationApplicability {
    OnPropertyChange = 1,
    OnAttach = 2,
    OnQuery = 4,
    OnSave = 8,
    Default = OnPropertyChange | OnAttach | OnSave
  }

  // DON'T ADD back without discussing with Jay
  // Possiblity of throwing an exception while validating requires changes in a number of places
  // to insure other process aren't broken (example is during a query)
  //public enum ValidationNotificationMode {
  //  /// <summary>
  //  /// Causes notification through the <b>INotifyDataErrorInfo</b> interface.
  //  /// </summary>
  //  Notify = 1,

  //  /// <summary>
  //  /// Throws an exception.
  //  /// </summary>
  //  ThrowException = 2,

  //  /// <summary>
  //  /// Notify using <b>INotifyDataErrorInfo</b> and throw exception.
  //  /// </summary>
  //  NotifyAndThrowException = 3
  //}

}
