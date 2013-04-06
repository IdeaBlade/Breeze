using System.Collections.Generic;
using System.Data.Entity;
using System.Linq;

namespace BreezyDevices.Models
{
    public class BreezyDevicesDatabaseInitializer :
       // If you prefer to preserve the database between server sessions, 
       // inherit from DropCreateDatabaseIfModelChanges by uncommenting next line
       //DropCreateDatabaseIfModelChanges<BreezyDevicesContext> 

       // When creating the database the first time of 
       // if you prefer to recreate with every new server session
       // inherit from DropCreateDatabaseAlways by uncommenting next line
       DropCreateDatabaseAlways<BreezyDevicesContext>
    {
        protected override void Seed(BreezyDevicesContext context)
        {
            SeedDatabase(context);
        }

        public static void ResetDatabase(BreezyDevicesContext context)
        {
            PurgeDatabase(context);
            SeedDatabase(context);
        }

        public static void PurgeDatabase(BreezyDevicesContext context)
        {
            var devices = context.Devices.ToList();
            foreach (var device in devices)
            {
                context.Devices.Remove(device);
            }
            var people = context.People.ToList();
            foreach (var person in people)
            {
                context.People.Remove(person);
            }
            context.SaveChanges(); 
        }

        public static void SeedDatabase(BreezyDevicesContext context)
        {
            var persons = new List<Person>();
            var devices = new List<Device>();
            var personId = 0;
            var deviceId = 0;

            persons.Add(new Person
            {
                FirstName = "Julie",
                LastName = "Lerman",
                IdentityCardNumber = "12345",
                PersonId = ++personId
            });
            devices.AddRange(new[]
                {
                    new Device {
                        DeviceName = "IPad",
                        DeviceId = ++deviceId, PersonId = personId},
                    new Device {
                        DeviceName = "Nokia Lumia 900",
                        DeviceId = ++deviceId, PersonId = personId}
                });

            persons.Add(new Person
            {
                FirstName = "Sampson",
                LastName = "Lerman",
                IdentityCardNumber = "woof",
                PersonId = ++personId
            });
            devices.AddRange(new[]
                {
                    new Device {
                        DeviceName = "leash",
                        DeviceId = ++deviceId, PersonId = personId},
                   new Device {
                        DeviceName = "slobber towel",
                        DeviceId = ++deviceId, PersonId = personId}                                       
                });

            persons.Add(new Person
            {
                FirstName = "Ward",
                LastName = "Bell",
                IdentityCardNumber = "IdeaBlade",
                PersonId = ++personId
            });
            devices.AddRange(new[]
                {
                    new Device {
                        DeviceName = "Giotto Evoluzione",
                        DeviceId = ++deviceId, PersonId = personId},
                    new Device {
                        DeviceName = "Windows 8 Build Tablet",
                        DeviceId = ++deviceId, PersonId = personId}                                       
                });

            persons.ForEach(p => context.People.Add(p));
            devices.ForEach(d => context.Devices.Add(d));
            context.SaveChanges(); // Save 'em
        }

    }
}