using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace MvcWebRole.Controllers
{
    public class HomeController : Controller
    {
        [Authorize(Roles = "VT-EMPLOYEE, VT-STUDENT-WAGE")]
        public ActionResult Index()
        {
            return View();
        }

        public ActionResult NotAuthorized()
        {
            return View();
        }

        public ActionResult CookiesRequired()
        {
            return View();
        }

        public ActionResult Logout()
        {
            DotNetCasClient.CasAuthentication.SingleSignOut();
            return RedirectToAction("Index");
        }
    }
}
