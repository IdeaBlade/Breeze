using System.Data.Entity;
using System.Data.Entity.ModelConfiguration.Conventions;

namespace CarBones.Models
{
    public class CarBonesContext : DbContext 
    {
        static CarBonesContext()
        {
            Database.SetInitializer(new CarBonesDatabaseInitializer());
        }
        public CarBonesContext()
            : base(nameOrConnectionString: "CarBones") { }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            // Use singular table names
            modelBuilder.Conventions.Remove<PluralizingTableNameConvention>();
        }

        public DbSet<Car> Cars { get; set; }
        public DbSet<Option> Options { get; set; }

    }
}