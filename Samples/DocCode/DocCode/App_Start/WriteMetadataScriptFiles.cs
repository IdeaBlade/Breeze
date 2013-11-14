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
            var scriptFilename = HostingEnvironment.MapPath("~/tests/helpers/northwindMetadata.js");
            const string prefix = "docCode.northwindMetadata = JSON.stringify(";
            const string postfix = ");";

            using (var writer = new StreamWriter(scriptFilename))
            {
                writer.WriteLine(prefix + metadata + postfix);
            }
        }

        /// <summary>
        /// Save Northwind DTO metadata to a script file
        /// Certain tests will load this script dynamically so they can get metadata
        /// without making a Web API call
        /// </summary>
        public static void WriteNorthwindDtoMetadataScriptFile()
        {
            var metadata = new NorthwindDtoRepository().Metadata;
            var scriptFilename = HostingEnvironment.MapPath("~/tests/helpers/northwindDtoMetadata.js");
            const string prefix = "docCode.northwindDtoMetadata = JSON.stringify(";
            const string postfix = ");";

            using (var writer = new StreamWriter(scriptFilename))
            {
                writer.WriteLine(prefix + metadata + postfix);
            }
        }
    }
}
