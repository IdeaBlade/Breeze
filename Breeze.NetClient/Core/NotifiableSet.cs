using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Breeze.Core {



  /// <summary>
  /// Represents an observable set of values.
  /// </summary>
  /// <typeparam name="T">The type of elements in the hash set.</typeparam>    
  public class NotifiableCollection<T> : KeyedCollection<T, T>, INotifyCollectionChanged, INotifyPropertyChanged, IDisposable {

    private SimpleMonitor monitor = new SimpleMonitor();
    

    /// <summary>
    /// Initializes a new instance of the <see cref="ObservableHashSet&lt;T&gt;"/> class.
    /// </summary>
    public NotifiableCollection() {
      
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="ObservableHashSet&lt;T&gt;"/> class.
    /// </summary>
    /// <param name="collection">The collection whose elements are copied to the new set.</param>
    public NotifiableCollection(IEnumerable<T> collection)  {
      collection.ForEach(item => this.Add(item));
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="ObservableHashSet&lt;T&gt;"/> class.
    /// </summary>
    /// <param name="comparer">The IEqualityComparer&lt;T&gt; implementation to use when comparing values in the set, or null to use the default EqualityComparer&lt;T&gt; implementation for the set type.</param>
    public NotifiableCollection(IEqualityComparer<T> comparer) : base(comparer) {
      
    }

    /// <summary>
    /// Initializes a new instance of the <see cref="ObservableHashSet&lt;T&gt;"/> class.
    /// </summary>
    /// <param name="collection">The collection whose elements are copied to the new set.</param>
    /// <param name="comparer">The IEqualityComparer&lt;T&gt; implementation to use when comparing values in the set, or null to use the default EqualityComparer&lt;T&gt; implementation for the set type.</param>
    public NotifiableCollection(IEnumerable<T> collection, IEqualityComparer<T> comparer) :base(comparer) {
      collection.ForEach(item => this.Add(item));
    }

    protected override T GetKeyForItem(T item) {
      return item;
    }


    public void Dispose() {
      if (this.monitor != null) {
        this.monitor.Dispose();
        this.monitor = null;
      }
    }

    #region overriden Methods

    
    protected override void InsertItem(int index, T item) {
      this.CheckReentrancy();
      
      base.InsertItem(index, item);
        
      this.RaiseCollectionChanged(new NotifyCollectionChangedEventArgs(NotifyCollectionChangedAction.Add, item, index));
      this.RaisePropertyChanged(PropertyNames.Count);
    }

    protected override void ClearItems() {
      this.CheckReentrancy();

      base.ClearItems();

      this.RaiseCollectionChanged(new NotifyCollectionChangedEventArgs(NotifyCollectionChangedAction.Reset));
      this.RaisePropertyChanged(PropertyNames.Count);
    }

    protected override void RemoveItem(int index) {
      this.CheckReentrancy();

      var removedItem = this[index];
      base.RemoveItem(index);

      this.RaiseCollectionChanged(new NotifyCollectionChangedEventArgs(NotifyCollectionChangedAction.Remove, removedItem, index));
      this.RaisePropertyChanged(PropertyNames.Count);

    }

    protected override void SetItem(int index, T item) {
      this.CheckReentrancy();

      T originalItem = this[index];
      base.SetItem(index, item);

      this.RaiseCollectionChanged(new NotifyCollectionChangedEventArgs(NotifyCollectionChangedAction.Replace, originalItem, item, index));
      this.RaisePropertyChanged(PropertyNames.Count);
    }

    #endregion

    #region Events

    /// <summary>
    /// Raised when the collection changes.
    /// </summary>
    public event NotifyCollectionChangedEventHandler CollectionChanged;

    private void RaiseCollectionChanged(NotifyCollectionChangedEventArgs e) {
      if (this.CollectionChanged != null) {
        using (this.BlockReentrancy()) {
          this.CollectionChanged(this, e);
        }
      }
    }

    /// <summary>
    /// Raised when a property value changes.
    /// </summary>       
    public event PropertyChangedEventHandler PropertyChanged;

    private void RaisePropertyChanged(string propertyName) {
      if (this.PropertyChanged != null) {
        this.PropertyChanged(this, new PropertyChangedEventArgs(propertyName));
      }
    }

    #endregion

    #region Reentrancy Methods

    private IDisposable BlockReentrancy() {
      this.monitor.Enter();
      return this.monitor;
    }

    private void CheckReentrancy() {
      if ((this.monitor.Busy && (this.CollectionChanged != null)) && (this.CollectionChanged.GetInvocationList().Length > 1)) {
        throw new InvalidOperationException("There are additional attempts to change this hash set during a CollectionChanged event.");
      }
    }

    #endregion  

    #region Private Classes

    private class SimpleMonitor : IDisposable {
      private int _busyCount;

      public void Dispose() {
        this._busyCount--;
      }

      public void Enter() {
        this._busyCount++;
      }

      public bool Busy {
        get {
          return (this._busyCount > 0);
        }
      }
    }


    #endregion


    /// <summary>
    /// The property names used with INotifyPropertyChanged.
    /// </summary>
    public static class PropertyNames {
      public const string Count = "Count";
    }
  }
}
