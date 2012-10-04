namespace Breeze.Learn.Controllers {
    using System.Web.Mvc;

    public class SampleDataController : Controller {
        public ActionResult Index() {
            var sessionId = HttpContext.Session.SessionID; //use this to key all request for data

            return View();
        }
    }
}