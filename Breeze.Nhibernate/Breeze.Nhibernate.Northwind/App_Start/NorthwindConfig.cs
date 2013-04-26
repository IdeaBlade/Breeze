using System;
using System.Web.Optimization;

[assembly: WebActivator.PostApplicationStartMethod(
    typeof(Breeze.Nhibernate.Northwind.App_Start.NorthwindConfig), "PreStart")]

namespace Breeze.Nhibernate.Northwind.App_Start
{
    public static class NorthwindConfig
    {
        public static void PreStart()
        {
            // Add your start logic here
            BundleConfig.RegisterBundles(BundleTable.Bundles);
        }
    }
}