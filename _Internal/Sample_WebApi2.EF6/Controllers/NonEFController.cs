// #define DBCONTEXT_PROVIDER 
// 
using System;
using System.Data;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;

using System.Collections.Generic;

#if DBCONTEXT_PROVIDER
using Models.NorthwindIB.CF;
#else
using Models.NorthwindIB.EDMX;
using Newtonsoft.Json;
#endif


namespace Sample_WebApi.Controllers {

  


  public class NonEFContextProvider   {
    
  

    public override bool BeforeSaveEntity(EntityInfo entityInfo) {
      // prohibit any additions of entities of type 'Role'
      if (entityInfo.Entity.GetType() == typeof(Role) && entityInfo.EntityState == EntityState.Added) {
        return false;
      } else {
        return true;
      }
    }

    public override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {
      return saveMap;
    }
      
  }

  public class NonEFModelController : ApiController {


    NonEFContextProvider ContextProvider = new NonEFContextProvider();


    [AcceptVerbs("GET")]
    public String Metadata() {
      return ContextProvider.Metadata();
    }

    [AcceptVerbs("POST")]
    public SaveResult SaveChanges(JObject saveBundle) {
      // return ContextProvider.SaveChanges(saveBundle);
    }

    #region standard queries

    [AcceptVerbs("GET")]
    public IQueryable<Person> Persons() {
      var custs = ContextProvider.Context.Customers;
      return custs;
    }

    [AcceptVerbs("GET")]
    public IQueryable<Meal> Meals() {
      var orders = ContextProvider.Context.Orders;
      return orders;
    }
    
    [AcceptVerbs("GET")]
    public IQueryable<FoodType> FoodTypes() {
      return ContextProvider.Context.Employees;
    }

    
    #endregion

    #region named queries

    #endregion
  }

  

}