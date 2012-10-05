using System;
using System.Data.Entity;

// For EF CodeFirst projects only 

namespace $rootnamespace$.Models
{
    public class BreezeSamspleDatabaseInitializer:
        DropCreateDatabaseIfModelChanges<BreezeSampleContext> 
    {
        protected override void Seed(BreezeSampleContext context)
        {
            // implement initial database data here.
        }

    }
}