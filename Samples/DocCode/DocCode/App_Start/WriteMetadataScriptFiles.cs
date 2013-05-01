using System.IO;
using System.Web.Hosting;
using DocCode.DataAccess;

namespace DocCode.App_Start
{
    /// <summary>
    /// Creates and saves JSON metadata as JavaScript file(s).
    /// </summary>
    public static class WriteMetadataScriptFiles
    {
        /// <summary>
        /// Save Northwind metadata to a script file
        /// Certain tests will load this script dynamically so they can get metadata
        /// without making a Web API call
        /// </summary>
        public static void WriteNorthwindMetadataScriptFile()
        {
            var metadata = new NorthwindRepository().Metadata;
            var scriptFilename = HostingEnvironment.MapPath("~/tests/northwindMetadata.js");
            const string prefix = "define(function () {return ";
            const string postfix = "});";

            using (var writer = new StreamWriter(scriptFilename))
            {
                writer.WriteLine(prefix + metadata + postfix);
            }
        }
    }
}
