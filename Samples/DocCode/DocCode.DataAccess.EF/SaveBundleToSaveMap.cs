using System;
using System.Collections.Generic;
using System.Data;
using Breeze.ContextProvider;
using Newtonsoft.Json.Linq;

namespace DocCode.DataAccess
{
    /// <summary>
    /// A demonstration of technique to convert a saveBundle into a SaveMap
    /// for use by custom server code that didn't want to use a ContextProvider to handle
    /// change-set saves.
    /// </summary>
    /// <remarks>
    /// This class leverages utilities within the base ContextProvider to effect this conversion
    /// It is NOT a functioning ContextProvider!
    /// There are no examples of usage yet.
    /// </remarks>
    public class SaveBundleToSaveMap : ContextProvider 
    {
        // Never create a public instance
        private SaveBundleToSaveMap(){}

        /// <summary>
        /// Convert a saveBundle into a SaveMap
        /// </summary>
        public static Dictionary<Type, List<EntityInfo>> Convert(JObject saveBundle)
        {
            var dynSaveBundle = (dynamic) saveBundle;
            var entitiesArray = (JArray) dynSaveBundle.entities;
            var provider = new SaveBundleToSaveMap();
            var saveWorkState = new SaveWorkState(provider, entitiesArray);
            return saveWorkState.SaveMap;
        }

        #region required overrides DO NOT USE ANY OF THEM
        public override IDbConnection GetDbConnection()
        {
            throw new NotImplementedException();
        }

        protected override void OpenDbConnection()
        {
            throw new NotImplementedException();
        }

        protected override void CloseDbConnection()
        {
            throw new NotImplementedException();
        }

        protected override string BuildJsonMetadata()
        {
            throw new NotImplementedException();
        }

        protected override void SaveChangesCore(SaveWorkState saveWorkState)
        {
            throw new NotImplementedException();
        }
    #endregion
    }
}
