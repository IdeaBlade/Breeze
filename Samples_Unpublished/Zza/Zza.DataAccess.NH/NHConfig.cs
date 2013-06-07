using NHibernate;
using NHibernate.Cfg;

namespace Zza.DataAccess
{
    public static class NHConfig
    {
        private static Configuration _configuration;
        private static ISessionFactory _sessionFactory;

        static NHConfig()
        {
            var modelAssembly = typeof(Zza.Model.Customer).Assembly;
            var mappingAssembly = typeof(NHConfig).Assembly;

            // Configure NHibernate
            _configuration = new Configuration();
            _configuration.AddAssembly(modelAssembly);
            _configuration.AddAssembly(mappingAssembly);
            _configuration.Configure();  //configure from the app.config

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


    }
}
