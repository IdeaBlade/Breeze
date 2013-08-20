//#define NHIBERNATE

using System;
using System.Collections.Generic;
using System.Linq;
using System.Web.Http;
using Breeze.WebApi;
using Newtonsoft.Json.Linq;

#if NHIBERNATE
using Breeze.Nhibernate.WebApi;
using Models.Produce.NH;
using NHibernate;
using NHibernate.Linq;
#else
using ProduceTPH;
#endif


namespace Sample_WebApi.Controllers {
   
#if NHIBERNATE
  public class ProduceTPHContextProvider  : ProduceNHContext {
#else
  public class ProduceTPHContextProvider  : EFContextProvider<ProduceTPHContext> {

    public new ProduceTPHContext Context = new ProduceTPHContext();
#endif
    


    protected override bool BeforeSaveEntity(EntityInfo entityInfo) {
        return true;
    }

    protected override Dictionary<Type, List<EntityInfo>> BeforeSaveEntities(Dictionary<Type, List<EntityInfo>> saveMap) {
      return saveMap;
    }


    protected override void SaveChangesCore(SaveWorkState saveWorkState) {
      throw new NotImplementedException();
    }
  }

  [BreezeController]
  public class ProduceTPHController : ApiController {


    ProduceTPHContextProvider ContextProvider = new ProduceTPHContextProvider();


    [HttpGet]
    public String Metadata() {
#if NHIBERNATE
      return ContextProvider.GetHardcodedMetadata();
#else
      return ContextProvider.Metadata();
#endif
    }

    [HttpPost]
    public SaveResult SaveChanges(JObject saveBundle) {
      return ContextProvider.SaveChanges(saveBundle);
    }

    #region standard queries

    [HttpGet]
    public IQueryable<ItemOfProduce> ItemsOfProduce() {
        return ContextProvider.Context.ItemsOfProduce;
    }


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