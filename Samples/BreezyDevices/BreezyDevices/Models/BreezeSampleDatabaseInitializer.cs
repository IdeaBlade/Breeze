using System;
using System.Data.Entity;

namespace BreezyDevices.Models
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
            var samples = new []
                {
                    // Description IsDone
                    new BreezeSampleItem{Description = "Wake up"},
                    new BreezeSampleItem{Description = "Do dishes", IsDone = true},
                    new BreezeSampleItem{Description = "Mow lawn", IsDone = true},
                    new BreezeSampleItem{Description = "Try Breeze"},
                    new BreezeSampleItem{Description = "Tell the world"},
                    new BreezeSampleItem{Description = "Go home early"},
                };

            Array.ForEach(samples, t => context.Samples.Add(t));

            context.SaveChanges(); // Save 'em
        }
    }
}
