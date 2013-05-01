using Breeze.Nhibernate.Northwind;
using Breeze.Nhibernate.NorthwindIBModel;
using log4net;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using NHibernate;
using NHibernate.Linq;
using System.Linq;

[assembly: log4net.Config.XmlConfigurator(Watch = true)]
namespace Breeze.Nhibernate.NorthwindIBTests
{
    [TestClass]
    public class QueryTest1
    {
        private ISession session;
        private ILog logger;

        [TestInitialize]
        public void Initialize()
        {
            logger = log4net.LogManager.GetLogger("QueryTest1");
            session = NorthwindConfig.OpenSession();
        }

        [TestCleanup]
        public void Cleanup()
        {
            if (session != null) session.Close();
        }

        [TestMethod]
        public void TestOrdersWithCustomers()
        {
            logger.Debug("TestOrdersWithCustomers begin");
            var ordersWithCustomers = session.Query<Order>()
                .Fetch(o => o.Customer) // this will do an outer join by default... there's no way to specify join type
                .ToList();

            // IsInitialized would return false if Customer was a proxy
            ordersWithCustomers.ForEach(o => Assert.IsTrue(NHibernateUtil.IsInitialized(o.Customer)));
            logger.Debug("TestOrdersWithCustomers end.  count=" + ordersWithCustomers.Count);
        }

        [TestMethod]
        public void TestInternationalOrders()
        {
            logger.Debug("TestInternationalOrders begin");
            var orders = session.Query<Order>()
                .Fetch(o => o.InternationalOrder)
                .ToList();

            orders.ForEach(o => Assert.IsTrue(NHibernateUtil.IsInitialized(o.InternationalOrder)));
            logger.Debug("TestInternationalOrders end.  count=" + orders.Count);
        }
    }
}
