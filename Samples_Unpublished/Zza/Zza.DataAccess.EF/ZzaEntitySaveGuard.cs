using System;
using System.Linq;
using Breeze.WebApi;
using Zza.Model;

namespace Zza.DataAccess.EF
{
    internal class ZzaEntitySaveGuard
    {
        /// <summary>
        /// Get and set the current user's StoreId;
        /// </summary>
        public Guid UserStoreId { get; set; }

        /// <summary>
        /// True if can save this entity else throw exception
        /// </summary>
        /// <exception cref="System.InvalidOperationException"></exception>
        public bool BeforeSaveEntity(EntityInfo arg)
        {
            var typeName = arg.Entity.GetType().Name;
            string saveError;
            var saveable = arg.Entity as ISaveable;

            if (UserStoreId == Guid.Empty)
            {
                saveError = "you are not authorized to save.";
            }
            else if (saveable == null)
            {
                saveError = "changes to '" + typeName + "' are forbidden.";

            }
            else
            {
                switch (arg.EntityState)
                {
                    case EntityState.Added:
                        saveable.StoreId = UserStoreId;
                        arg.OriginalValuesMap.Add("StoreId", UserStoreId);
                        saveError = saveable.CanAdd();
                        break;
                    case EntityState.Modified:
                    case EntityState.Deleted:
                        saveError = CanSaveExistingEntity(arg);
                        break;
                    default:
                        var stateName = Enum.GetName(typeof(EntityState), arg.EntityState);
                        saveError = " unexpected EntityState of " + stateName;
                        break;
                }
            }

            if (String.IsNullOrEmpty(saveError))
            {
                throw new InvalidOperationException(
                    "'" + arg.Entity.GetType().Name + "' may not be saved because " +
                    saveError);
            }
            return true;
        }

        /// <summary>
        /// DbContext for reading entities from the database during validations
        /// </summary>
        /// <remarks>
        /// Can't use the same context for reading and writing.
        /// Lazy instantiated because only used in a few cases.
        /// </remarks>
        private ZzaContext readContext
        {
            get { return _readContext ?? (_readContext = new ZzaContext()); }
        }

        private ZzaContext _readContext;

        #region Type-specific Entity Save Guards

        private string CanSaveExistingEntity(EntityInfo arg)
        {
            var type = arg.Entity.GetType();
            if (type == typeof(Customer))
            {
                return ExistingCustomerSaveGuard(arg);
            }
            if (type == typeof(Order))
            {
                return ExistingOrderSaveGuard(arg);
            }
            if (type == typeof(OrderItem))
            {
                return ExistingOrderItemSaveGuard(arg);
            }
            if (type == typeof(OrderItemOption))
            {
                return ExistingOrderItemOptionSaveGuard(arg);
            }

            return "is not a saveable type";
        }

        private string ExistingEntityGuard(ISaveable entity, object id)
        {
            if (entity == null)
            {
                return "the record with key " + id + " was not found.";
            }

            var storeId = entity.StoreId;
            if (storeId == null || storeId == Guid.Empty)
            {
                return "changes to an original record may not be saved.";
            }
            if (UserStoreId != storeId)
            {
                return "you may only change records created within your own user session.";
            }
            return null; // ok so far
        }

        private string ExistingCustomerSaveGuard(EntityInfo arg)
        {
            var entity = (Customer)arg.Entity;
            var orig = readContext.Customers.SingleOrDefault(e => e.Id == entity.Id);
            return ExistingEntityGuard(orig, entity.Id);
        }

        private string ExistingOrderSaveGuard(EntityInfo arg)
        {
            var entity = (Order)arg.Entity;
            var orig = readContext.Orders.SingleOrDefault(e => e.Id == entity.Id);
            return ExistingEntityGuard(orig, entity.Id);
        }

        private string ExistingOrderItemSaveGuard(EntityInfo arg)
        {
            var entity = (OrderItem)arg.Entity;
            var orig = readContext.OrderItems.SingleOrDefault(e => e.Id == entity.Id);
            return ExistingEntityGuard(orig, entity.Id);
        }

        private string ExistingOrderItemOptionSaveGuard(EntityInfo arg)
        {
            var entity = (OrderItemOption)arg.Entity;
            var orig = readContext.OrderItemOptions.SingleOrDefault(e => e.Id == entity.Id);
            return ExistingEntityGuard(orig, entity.Id);
        }

        #endregion
    }
}
