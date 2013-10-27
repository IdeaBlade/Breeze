using Models.NorthwindIB.NH;
using NHibernate;
using NHibernate.Cfg;

namespace NorthBreeze.Controllers
{
    public static class NHConfig
    {
        private static Configuration _configuration;
        private static ISessionFactory _sessionFactory;

        static NHConfig()
        {
            var modelAssembly = typeof(Customer).Assembly;

            _configuration = new Configuration();
            _configuration.Configure();  //configure from the web.config
            _configuration.AddAssembly(modelAssembly);  // mapping is in this assembly

            _sessionFactory = _configuration.BuildSessionFactory();
        }

        public static Configuration Configuration
        {
            get { return _configuration; }
        }

        public static ISession OpenSession()
        {
            ISession session = _sessionFactory.OpenSession();
            return session;
        }
    }
}