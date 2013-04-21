using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using System.Web.Http.OData.Builder;
using Microsoft.Data.Edm.Csdl;
using Breeze.WebApi;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;
using Sample_WebApi.Models;
using Microsoft.Data.Edm.Validation;
using System.Xml;
using System.IO;
using System.Xml.Linq;
using ProduceTPH;


namespace Sample_WebApi.Controllers {
   

  public class ProduceTPHContextProvider  : EFContextProvider<ProduceTPHContext> {
    
    public ProduceTPHContext Context = new ProduceTPHContext();


    protected override bool BeforeSaveEntity(EntityInfo entityInfo) {
        return true;
    }

    protected override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {
      return saveMap;
    }


    protected override List<KeyMapping> SaveChangesCore(Dictionary<Type, List<EntityInfo>> saveMap) {
      throw new NotImplementedException();
    }
  }

  [BreezeController]
  public class ProduceTPHController : ApiController {


    ProduceTPHContextProvider ContextProvider = new ProduceTPHContextProvider();


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
    public IQueryable<Fruit> Fruits() {
      return ContextProvider.Context.ItemsOfProduce.OfType<Fruit>();
    }


    [HttpGet]
    public IQueryable<Apple> Apples() {
      return  ContextProvider.Context.ItemsOfProduce.OfType<Apple>();
    }

    #endregion

    #region named queries

    #endregion
  }

  

}