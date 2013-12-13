using System;
using System.Linq;
using Breeze.ContextProvider;
// using Breeze.ContextProvider.EF6;
using Northwind.Models;

namespace DocCode.DataAccess
{
    internal class NorthwindEntitySaveGuard
    {
        /// <summary>
        /// Get and set the current UserSessionId;
        /// </summary>
        public Guid UserSessionId { get; set; }


        /// <summary>
        /// True if can save this entity else throw exception
        /// </summary>
        /// <exception cref="System.InvalidOperationException"></exception>
        public bool BeforeSaveEntity(EntityInfo arg)
        {
            var typeName = arg.Entity.GetType().Name;
            string saveError;
            var saveable = arg.Entity as ISaveable;

            if (UserSessionId == Guid.Empty)
            {
                saveError = "you are not authorized to save.";
            } else if (saveable == null)
            {
                saveError = "changes to '" + typeName + "' are forbidden.";
            }
            else
            {
                switch (arg.EntityState)
                {
                    case EntityState.Added:
                        saveable.UserSessionId = UserSessionId;
                        arg.OriginalValuesMap.Add("UserSessionId", UserSessionId);
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

            if (!String.IsNullOrEmpty(saveError))
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
        private NorthwindContext readContext
        {
            get { return _readContext ?? (_readContext = new NorthwindContext()); }
        }
        private NorthwindContext _readContext;

        #region Type-specific Entity Save Guards

        private string CanSaveExistingEntity(EntityInfo arg)
        {
            var type = arg.Entity.GetType();
            if (type == typeof(Customer))
            {
                return ExistingCustomerSaveGuard(arg);
            }
            if (type == typeof(Employee))
            {
                return ExistingEmployeeSaveGuard(arg);
            }
            if (type == typeof(Order))
            {
                return ExistingOrderSaveGuard(arg);
            }
            if (type == typeof(OrderDetail))
            {
                return ExistingOrderDetailSaveGuard(arg);
            }
            if (type == typeof(InternationalOrder))
            {
                return ExistingInternationalOrderSaveGuard(arg);
            }
            if (type == typeof(User))
            {
                return ExistingUserSaveGuard(arg);
            }
            return "is is not a saveable type";
        }

        private string ExistingEntityGuard(ISaveable entity, object id)
        {
            if (entity == null)
            {
                return "the record with key " + id + " was not found.";
            }

            var userSessionId = entity.UserSessionId;
            if (userSessionId == null || userSessionId == Guid.Empty)
            {
                return "changes to an original record may not be saved.";
            }
            if (userSessionId != UserSessionId)
            {
                return "you may only change records created within your own user session.";
            }
            return null; // ok so far
        }

        private string ExistingCustomerSaveGuard(EntityInfo arg)
        {
            var entity = (Customer)arg.Entity;
            var orig = readContext.Customers.SingleOrDefault(e => e.CustomerID == entity.CustomerID);
            return ExistingEntityGuard(orig, entity.CustomerID);
        }

        private string ExistingEmployeeSaveGuard(EntityInfo arg)
        {
            var entity = (Employee)arg.Entity;
            var orig = readContext.Employees.SingleOrDefault(e => e.EmployeeID == entity.EmployeeID);
            return ExistingEntityGuard(orig, entity.EmployeeID);
        }

        private string ExistingOrderSaveGuard(EntityInfo arg)
        {
            var entity = (Order)arg.Entity;
            var orig = readContext.Orders.SingleOrDefault(e => e.OrderID == entity.OrderID);
            return ExistingEntityGuard(orig, entity.OrderID);
        }

        private string ExistingOrderDetailSaveGuard(EntityInfo arg)
        {
            var entity = (OrderDetail)arg.Entity;
            var orig = readContext.OrderDetails
                                  .SingleOrDefault(e => e.OrderID == entity.OrderID &&
                                                        e.ProductID == entity.ProductID);
            var key = "(" + entity.OrderID + "," + entity.ProductID + ")";
            return ExistingEntityGuard(orig, key);
        }

        private string ExistingInternationalOrderSaveGuard(EntityInfo arg)
        {
            var entity = (InternationalOrder)arg.Entity;
            var orig = readContext.InternationalOrders.SingleOrDefault(e => e.OrderID == entity.OrderID);
            return ExistingEntityGuard(orig, entity.OrderID);
        }

        private string ExistingUserSaveGuard(EntityInfo arg)
        {
            var entity = (User)arg.Entity;
            var orig = readContext.Users.SingleOrDefault(e => e.Id == entity.Id);
            return ExistingEntityGuard(orig, entity.Id);
        }

        #endregion

    }
}
