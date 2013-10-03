using System;
using System.Linq;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;
using Zza.Interfaces;
using Zza.Model;
using Breeze.WebApi.EF;

namespace Zza.DataAccess.EF
{
    /// <summary>
    /// Development repository; not part of the app.
    /// </summary>
    public class DevRepository 
    {
        public DevRepository()
        {
            _contextProvider = new EFContextProvider<ZzaContext>();
        }

        /// <summary>
        /// Get and set current user's StoreId;
        /// typically set by the controller
        /// </summary>
        public Guid UserStoreId
        {
            get { return _userStoreId; }
            set {
                _userStoreId = (value == Guid.Empty) ? Config.GuestStoreId : value;
            }
        }
        private Guid _userStoreId = Config.GuestStoreId;

        public string Reset(string options)
        {
            // If full reset, delete all additions to the database
            // else delete additions made during this user's session
            var where = options.Contains("fullreset")
                ? "IS NOT NULL"
                : ("= '" + UserStoreId + "'");

            string deleteSql;
            deleteSql = "DELETE FROM [ORDERITEMOPTION] WHERE [STOREID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [ORDERITEM] WHERE [STOREID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [ORDER] WHERE [STOREID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            deleteSql = "DELETE FROM [CUSTOMER] WHERE [STOREID] " + where;
            Context.Database.ExecuteSqlCommand(deleteSql);
            return "reset";
        }

        private ZzaContext Context { get { return _contextProvider.Context; } }

        private IQueryable<T> ForCurrentUser<T>(IQueryable<T> query) where T : class, ISaveable
        {
            return query.Where(x => x.StoreId == null || x.StoreId == UserStoreId);
        }

        private readonly EFContextProvider<ZzaContext> _contextProvider;


    }
}
