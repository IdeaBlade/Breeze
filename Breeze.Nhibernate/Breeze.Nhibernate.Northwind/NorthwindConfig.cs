using Breeze.Nhibernate.NorthwindIBModel;
using NHibernate;
using NHibernate.Cfg;

namespace Breeze.Nhibernate.Northwind
{
    /// <summary>
    /// A static configurator for NHibernate.  There are better ways.
    /// </summary>
    public static class NorthwindConfig
    {
        private static Configuration _configuration;
        private static ISessionFactory _sessionFactory;

        static NorthwindConfig()
        {
            var modelAssembly = typeof(Customer).Assembly;

            // Configure NHibernate
            _configuration = new Configuration();
            _configuration.Configure();  //configure from the app.config
            _configuration.AddAssembly(modelAssembly);  // mapping is in this assembly

            _sessionFactory = _configuration.BuildSessionFactory();
        }

        public static Configuration Configuration
        {
            get { return _configuration; }
        }

        public static ISessionFactory SessionFactory
        {
            get { return _sessionFactory; }
        }

        public static ISession OpenSession()
        {
            ISession session = _sessionFactory.OpenSession();
            return session;
        }

        public static IStatelessSession OpenStatelessSession()
        {
            IStatelessSession session = _sessionFactory.OpenStatelessSession();
            return session;
        }

    }
}
