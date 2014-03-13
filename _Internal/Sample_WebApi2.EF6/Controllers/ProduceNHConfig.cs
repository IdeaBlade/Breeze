using Models.Produce.NH;
using NHibernate;
using NHibernate.Cfg;

namespace Sample_WebApi2.Controllers {

  public static class ProduceNHConfig {
        //private static Configuration configuration;
        private static ISessionFactory _sessionFactory;

        static ProduceNHConfig()
        {
            var modelAssembly = typeof(ItemOfProduce).Assembly;
          
            // Configure NHibernate
            var configuration = new Configuration();
            configuration.Configure();  //configure from the app.config
            configuration.SetProperty("connection.connection_string_name", "ProduceTPHConnection");
            configuration.AddAssembly(modelAssembly);  // mapping is in this assembly

            _sessionFactory = configuration.BuildSessionFactory();
        }

        //public static Configuration Configuration
        //{
        //    get { return _configuration; }
        //}

        public static ISessionFactory SessionFactory
        {
            get { return _sessionFactory; }
        }

        public static ISession OpenSession()
        {
            ISession session = _sessionFactory.OpenSession();
            return session;
        }

  }
}