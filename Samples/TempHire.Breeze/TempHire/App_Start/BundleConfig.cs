using System;
using System.Web.Optimization;

namespace TempHire
{
    public class BundleConfig
    {
        public static void RegisterBundles(BundleCollection bundles)
        {
            bundles.IgnoreList.Clear();
            AddDefaultIgnorePatterns(bundles.IgnoreList);

            bundles.Add(
                new ScriptBundle("~/scripts/modernizr")
                    .Include("~/scripts/modernizr-{version}.js"));

            bundles.Add(
              new ScriptBundle("~/scripts/vendor")
                .Include("~/scripts/jquery-{version}.min.js")
                .Include("~/scripts/knockout-{version}.js")
                .Include("~/scripts/sammy-{version}.min.js")
                .Include("~/scripts/bootstrap.min.js")
                .Include("~/scripts/toastr.js")
                .Include("~/scripts/Q.min.js")
                .Include("~/scripts/breeze.debug.js")
                .Include("~/scripts/breeze.min.js")
                .Include("~/scripts/bootstrap.min.js")
              );

            bundles.Add(
              new StyleBundle("~/Content/css")
                .Include("~/Content/bootstrap.min.css")
                .Include("~/Content/bootstrap-responsive.min.css")
                .Include("~/Content/toastr.css")
                .Include("~/Content/styles.css")
                .Include("~/Content/durandal.css")
              );
        }

        public static void AddDefaultIgnorePatterns(IgnoreList ignoreList)
        {
            if (ignoreList == null)
            {
                throw new ArgumentNullException("ignoreList");
            }

            ignoreList.Ignore("*.intellisense.js");
            ignoreList.Ignore("*-vsdoc.js");
            //ignoreList.Ignore("*.debug.js", OptimizationMode.WhenEnabled);
            //ignoreList.Ignore("*.min.js", OptimizationMode.WhenDisabled);
            //ignoreList.Ignore("*.min.css", OptimizationMode.WhenDisabled);

            ignoreList.Ignore("breeze.debug.js", OptimizationMode.WhenEnabled);
            ignoreList.Ignore("breeze.min.js", OptimizationMode.WhenDisabled);
        }
    }
}