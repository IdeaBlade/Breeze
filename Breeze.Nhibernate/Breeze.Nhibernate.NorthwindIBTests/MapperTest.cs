using System;
using Microsoft.VisualStudio.TestTools.UnitTesting;
using NHibernate.NorthwindIBModel;

namespace NHibernate.NorthwindIBModel.Tests
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
            //Mapper.MakeHbm();
        }
    }
}
