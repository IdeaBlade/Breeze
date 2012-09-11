using System.Web.Mvc;

namespace Sample_WebApi.Controllers {
  public class HomeController : Controller {
    public ActionResult Index() {
      return View();
    }
  }
}
