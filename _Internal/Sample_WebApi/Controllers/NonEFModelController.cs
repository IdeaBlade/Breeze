using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

using Sample_WebApi.Models;

namespace Sample_WebApi.Controllers {


  public class NonEFContextProvider  : ContextProvider {
    
    public NonEFModelContext Context = new NonEFModelContext();

    protected override bool BeforeSaveEntity(EntityInfo entityInfo) {
        return true;
    }

    protected override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {
      return saveMap;
    }
    
    protected override string BuildJsonMetadata() {
      return null;
    }

    protected override List<KeyMapping> SaveChangesCore(Dictionary<Type, List<EntityInfo>> saveMap) {
      throw new NotImplementedException();
    }
  }

  [BreezeController]
  public class NonEFModelController : ApiController {


    NonEFContextProvider ContextProvider = new NonEFContextProvider();


    [HttpGet]
    public String Metadata() {
      return ContextProvider.Metadata();
    }

    [HttpPost]
    public SaveResult SaveChanges(JObject saveBundle) {
      return ContextProvider.SaveChanges(saveBundle);
    }

    #region standard queries

    [HttpGet]
    public IQueryable<Person> Persons() {
      var custs = ContextProvider.Context.Persons;
      return custs;
    }

    [HttpGet]
    public IQueryable<Meal> Meals() {
      var orders = ContextProvider.Context.Meals;
      return orders;
    }
    
    
    #endregion

    #region named queries

    #endregion
  }

  

}