/*****************************************************
 * Breeze Labs: EdmBuilder
 *
 * v.1.0.1
 * Copyright 2014 IdeaBlade, Inc.  All Rights Reserved.  
 * Licensed under the MIT License
 * http://opensource.org/licenses/mit-license.php
 *****************************************************/
using System.Data.Entity;
using System.IO;
using System.Xml;
using Microsoft.Data.Edm.Csdl;

namespace Microsoft.Data.Edm
{
    /// <summary>
    /// DbContext extension that builds an "Entity Data Model" (EDM) from a <see cref="DbContext"/>
    /// </summary>
    /// <remarks>
    /// We need the EDM both to define the Web API OData route and as a
    /// source of metadata for the Breeze client. 
    /// The Web API OData literature recommends the
    /// <see cref="System.Web.Http.OData.Builder.ODataConventionModelBuilder"/>.
    /// That component is suffient for route definition but fails as a source of 
    /// metadata for Breeze because (as of this writing) it neglects to include the
    /// foreign key definitions Breeze requires to maintain navigation properties
    /// of client-side JavaScript entities.
    /// <p>This EDM Builder ask the EF DbContext to supply the metadata which 
    /// satisfy both route definition and Breeze.</p>
    /// </remarks>
    public static class EdmBuilder
    {
        /// <summary>
        /// Builds an "Entity Data Model" (EDM) from a <see cref="DbContext"/>
        /// </summary>
        /// <example>
        /// /* In the WebApiConfig.cs */
        /// using (var context = new TodoListContext())
        /// {
        ///   config.Routes.MapODataRoute(
        ///       routeName: "odata", 
        ///       routePrefix: "odata", 
        ///       model: context.GetEdm(), 
        ///       batchHandler: new DefaultODataBatchHandler(GlobalConfiguration.DefaultServer)
        ///       );
        /// }
        /// </example>
        /// <param name="dbContext">The source <see cref="DbContext"/></param>
        /// <returns>An XML <see cref="IEdmModel"/> </returns>
        public static IEdmModel GetEdm(this DbContext dbContext)
        {
            using (var stream = new MemoryStream())
            {
                using (var writer = XmlWriter.Create(stream))
                {
                    System.Data.Entity.Infrastructure.EdmxWriter.WriteEdmx(dbContext, writer);
                }
                stream.Position = 0;
                using (var reader = XmlReader.Create(stream))
                {
                    return EdmxReader.Parse(reader);
                }
            }
        }
    }
}