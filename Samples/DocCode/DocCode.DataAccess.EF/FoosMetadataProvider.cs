using System.Data.Entity;

using Breeze.ContextProvider.EF6;
using FooBar.Models;

namespace DocCode.DataAccess
{
    public class FoosMetadataProvider
    {
       static FoosMetadataProvider()
       {
           var contextProvider = new EFContextProvider<FoosMetadataContext>();
            Metadata = contextProvider.Metadata();
       }

        public static string Metadata { get; private set; }
    }
    internal class FoosMetadataContext : DbContext
    {
        static FoosMetadataContext()
        {
            Database.SetInitializer<FoosMetadataContext>(null);
        }
        public DbSet<Foo> Foos { get; set; }
    }

}