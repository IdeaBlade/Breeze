using System.Data.Entity;

namespace $rootnamespace$.Models
{
    public class BreezeSampleDatabaseInitializer :
        // If you prefer to preserve the database between server sessions
        // inherit from DropCreateDatabaseIfModelChanges
        //DropCreateDatabaseIfModelChanges<BreezeSampleContext>

        // When creating the database the first time or 
        // if you prefer to recreate with every new server session
        // inherit from DropCreateDatabaseAlways 
        DropCreateDatabaseAlways<BreezeSampleContext>
    {
        protected override void Seed(BreezeSampleContext context)
        {
            context.SampleItems.Add(
                new BreezeSampleItem { Id = 1, Name = "Value 1" });
            context.SampleItems.Add(
                new BreezeSampleItem { Id = 2, Name = "Value 2" });
            context.SaveChanges();
        }
    }
}
