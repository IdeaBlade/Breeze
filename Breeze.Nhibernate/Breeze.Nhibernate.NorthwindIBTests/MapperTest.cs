using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using Breeze.Nhibernate.NorthwindIBModel;

namespace Breeze.Nhibernate.NorthwindIBTests
{
    [TestClass]
    public class MapperTest
    {
        /// <summary>
        /// Just a convenient way to call the mapper, which generates the class and hbm files from the database.
        /// </summary>
        [TestMethod]
        public void TestMapper()
        {
            Mapper.MakeHbm();
        }
    }
}
