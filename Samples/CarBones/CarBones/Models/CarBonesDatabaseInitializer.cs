using System;
using System.Data.Entity;

namespace CarBones.Models
{
    // DEMONSTRATION/DEVELOPMENT ONLY
    public class CarBonesDatabaseInitializer :
        DropCreateDatabaseAlways<CarBonesContext> // re-creates every time the server starts
    {
        protected override void Seed(CarBonesContext context)
        {
            SeedDatabase(context);
        }

        public static void SeedDatabase(CarBonesContext context)
        {
            var cars = new[] {
                // Description, IsDone, IsArchived
                new Car {Id=1, Make = "Ford", Model = "Mustang"},
                new Car {Id=2, Make = "Chevy", Model = "Volt"},
                new Car {Id=3, Make = "Tesla", Model = "S"},           
            };
            Array.ForEach(cars, c => context.Cars.Add(c));

            var options = new[] {
                // Description, IsDone, IsArchived
                new Option {Id=1, Name = "Ford",  CarId = 2},
                new Option {Id=2, Name = "Chevy", CarId = 2},
                new Option {Id=3, Name = "Tesla", CarId = 2},          
            };
            Array.ForEach(options, o => context.Options.Add(o));

            context.SaveChanges(); // Save 'em
        }
    }
}