using System.Data.Entity;
namespace Northwind.Models
{
    /// <summary>
    /// Specialized DbContext for hiding a property (CustomerID_OLD) from
    /// client metadata while keeping it availble for EF operations
    /// that use the base <see cref="NorthwindContext"/>.
    /// </summary>
    /// <remarks>
    /// See the StackOverflow question for the scenario behind this class:
    /// http://stackoverflow.com/questions/16275184/how-can-i-tell-breeze-to-completely-ignore-a-property-from-a-code-first-generate/16314379#16314379
    /// </remarks>
    public class NorthwindMetadataContext : NorthwindContext
    {
        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            modelBuilder.Entity<Customer>().Ignore(t => t.CustomerID_OLD);
        }
    }
}
