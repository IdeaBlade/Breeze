namespace Todo.Controllers {
    using System.Web.Mvc;

    public class HomeController : Controller {
        //
        // GET: /Home/
        public ActionResult Index() {
            return View();
        }
    }
}