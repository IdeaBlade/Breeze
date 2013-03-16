namespace Breeze.Inspector.Models {
    using System.Data.Entity;

    public class InspectorContext : DbContext {

        // DEMONSTRATION/DEVELOPMENT ONLY
        static InspectorContext()
        {
            Database.SetInitializer(new InspectorDatabaseInitializer());
        }

        public DbSet<Inspector> Inspectors { get; set; }
        public DbSet<Job> Jobs { get; set; }
        public DbSet<Address> Addresses { get; set; }
        public DbSet<InspectionForm> Forms { get; set; }
    }
}