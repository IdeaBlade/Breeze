using System.Data.Entity;
using System.IO;
using Breeze.WebApi;

namespace DocCode.DataAccess
{
    /// <summary>
    /// Creates and saves a JavaScript file that wraps JSON.
    /// It's <see cref="WriteMetadataScriptFile{T}"/> 
    /// saves metadata as a script file.
    /// </summary>
    public static class JsonScriptFileWriter
    {
        //public MetadataScriptMaker()
        //{
        //    _scriptFilename = HostingEnvironment.MapPath("~/app/metadata/metadata.js");
        //}

        /// <summary>
        /// Creates and saves a JavaScript file that wraps
        /// JSON metadata from an <see cref="EFContextProvider{T}"/>.
        /// </summary>
        /// <typeparam name="T">Type of a <see cref="DbContext"/></typeparam>
        /// <param name="scriptFilename">filename of script on the server</param>
        /// <param name="prefix">JavaScript at the front of the JSON object stream.</param>
        /// <param name="postfix">JavaScript at the end of the file.</param>
        /// <remarks>
        /// Intended for saving metadata as a script file that can be
        /// loaded on a client. The client can then import the metadata 
        /// without asking the server for it. 
        /// This practice assumes that the metadata in the script file
        /// actually matches the metadata on the server; big trouble
        /// if they get out-of-sync!       
        /// </remarks>
        /// <example>
        /// JsonScriptFileWriter.WriteMetadataScriptFile{TodoContext}(
        ///     HostingEnvironment.MapPath("~/app/metadata/metadata.js"),
        ///     "app.metadata = ",
        ///     ";");
        /// </example>
        public static void WriteMetadataScriptFile<T>(
            string scriptFilename,           // filename of script on the server
            string prefix = "app.metadata = ", // JavaScript in front of the metadata object stream
            string postfix = ";") // JavaScript at the end of the metadata object stream
            where T : DbContext, new()
        {
            var metadata = new EFContextProvider<T>().Metadata();

            WriteJsonScriptFile(metadata, scriptFilename, prefix, postfix);
        }

        /// <summary>
        /// Creates and saves a JavaScript file containing the supplied JSON string
        /// </summary>
        /// <param name="json">JSON string to wrap</param>
        /// <param name="scriptFilename">filename of script on the server</param>
        /// <param name="prefix">JavaScript at the front of the JSON object stream.</param>
        /// <param name="postfix">JavaScript at the end of the file.</param>
        /// <example>
        /// JsonScriptFileWriter.WriteJSONScriptFile(
        ///     metadata,
        ///     HostingEnvironment.MapPath("~/app/metadata/metadata.js"),
        ///     "app.metadata = ",
        ///     ";");
        /// </example>
        public static void WriteJsonScriptFile(
            string json,          
            string scriptFilename,
            string prefix,        
            string postfix)       
        {
            // Save the Breeze Metadata as a <script/> file, a 2nd delivery vehicle
            using (var writer = new StreamWriter(scriptFilename))
            {
                writer.WriteLine(prefix + json + postfix);
            }
        }

    }
}
