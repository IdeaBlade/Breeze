using System;
using System.IO;
using DatabaseSchemaReader;
using DatabaseSchemaReader.CodeGen;

namespace Breeze.Nhibernate.NorthwindIBModel
{
    /// <summary>
    /// Generates the entity class files and .hbm.xml files from the database
    /// <see cref="http://dbschemareader.codeplex.com/"/>
    /// </summary>
    public class Mapper
    {
        const string providername = "System.Data.SqlClient";
        const string connectionString = @"Data Source=.;Integrated Security=true;Initial Catalog=NorthwindIB";
        public static void MakeHbm()
        {
            var dbReader = new DatabaseReader(connectionString, providername);
            var schema = dbReader.ReadAll();

            var directory = new DirectoryInfo("C:\\Temp\\Breeze.Nhibernate.NorthwindIBModel");
            var settings = new CodeWriterSettings
            {
                // or CodeTarget.PocoNHibernateFluent or CodeTarget.PocoEntityCodeFirst
                CodeTarget = CodeTarget.PocoNHibernateHbm,
                Namespace = "Breeze.Nhibernate.NorthwindIBModel"
            };
            var codeWriter = new CodeWriter(schema, settings);
            codeWriter.Execute(directory);
        }

    }
}
