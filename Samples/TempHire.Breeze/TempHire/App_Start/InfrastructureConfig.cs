using System;
using System.Web.Optimization;

[assembly: WebActivator.PostApplicationStartMethod (
    typeof(TempHire.App_Start.InfrastructureConfig), "PreStart")]

namespace TempHire.App_Start {
    public static class InfrastructureConfig {
        public static void PreStart() {
            // Add your start logic here
            BundleConfig.RegisterBundles(BundleTable.Bundles);
        }
    }
}