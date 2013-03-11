using System.Linq;
using System.Web.Http;
using CodeCamper.Models;
using Breeze.WebApi;

namespace CodeCamper.Controllers
{
    [BreezeController]
    public class CodeCamperController : ApiController
    {
        readonly EFContextProvider<CodeCamperDbContext> _contextProvider =
            new EFContextProvider<CodeCamperDbContext>();

        [HttpGet]
        public string Metadata()
        {
            return _contextProvider.Metadata();
        }

        // NO UPDATING ALLOWED
        //[HttpPost]
        //public SaveResult SaveChanges(JObject saveBundle)
        //{
        //    return _contextProvider.SaveChanges(saveBundle);
        //}

        [HttpGet]
        public object Lookups()
        {
            var rooms = _contextProvider.Context.Rooms;
            var tracks = _contextProvider.Context.Tracks;
            var timeslots = _contextProvider.Context.TimeSlots;
            return new { rooms, tracks, timeslots };
        }

        [HttpGet]
        public IQueryable<Session> Sessions()
        {
            return _contextProvider.Context.Sessions;
        }

        [HttpGet]
        public IQueryable<Person> Speakers()
        {
            return _contextProvider.Context.Persons.Where(p => p.SpeakerSessions.Any());
        }

        [HttpGet]
        public IQueryable<Person> Persons()
        {
            return _contextProvider.Context.Persons;
        }

        // Among the Lookups only Rooms is exposed directly
        [HttpGet]
        public IQueryable<Room> Rooms()
        {
            return _contextProvider.Context.Rooms;
        }
    }
}