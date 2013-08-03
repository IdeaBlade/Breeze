using Breeze.Nhibernate.WebApi;
using Models.Produce.NH;

namespace Sample_WebApi.Controllers {

  public class ProduceNHContext : NHContext {

        public ProduceNHContext() : base(ProduceNHConfig.OpenSession(), ProduceNHConfig.Configuration) { }

        public ProduceNHContext(NHContext sourceContext) : base(sourceContext) { }

        public ProduceNHContext Context
        {
            get { return this; }
        }
        public NhQueryableInclude<Apple> Apples
        {
            get { return GetQuery<Apple>(); }
        }
        public NhQueryableInclude<Fruit> Fruits
        {
            get { return GetQuery<Fruit>(); }
        }
        public NhQueryableInclude<ItemOfProduce> ItemsOfProduce
        {
            get { return GetQuery<ItemOfProduce>(); }
        }
        public NhQueryableInclude<Strawberry> Strawberries
        {
            get { return GetQuery<Strawberry>(); }
        }
        public NhQueryableInclude<Tomato> Tomatoes
        {
            get { return GetQuery<Tomato>(); }
        }
        public NhQueryableInclude<Vegetable> Vegetables
        {
            get { return GetQuery<Vegetable>(); }
        }
        public NhQueryableInclude<WhitePotato> WhitePotatoes
        {
            get { return GetQuery<WhitePotato>(); }
        }
  }
}