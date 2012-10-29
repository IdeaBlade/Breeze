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
                new Car {Id=1, Make = "Ford", Model = "Mustang"},
                new Car {Id=2, Make = "Chevy", Model = "Volt"},
                new Car {Id=3, Make = "Tesla", Model = "S"},           
            };
            Array.ForEach(cars, c => context.Cars.Add(c));

            var options = new[] {
                new Option {Id=1, Name = "Chrome fender badges",  CarId = 1},
                new Option {Id=2, Name = "Convertible", CarId = 1},

                new Option {Id=3, Name = "Whitewalls",  CarId = 2},
                new Option {Id=4, Name = "Sunroof", CarId = 2},
                new Option {Id=5, Name = "All leather interior", CarId = 2}, 
    
                new Option {Id=6, Name = "85 kWh battery", CarId = 3},
                new Option {Id=7, Name = "Signature Red paint", CarId = 3},
                new Option {Id=8, Name = "Carbon fiber spoiler", CarId = 3},
                new Option {Id=9, Name = "21\" grey wheels with performance tires", CarId = 3}

            };
            Array.ForEach(options, o => context.Options.Add(o));

            context.SaveChanges(); // Save 'em
        }
    }
}