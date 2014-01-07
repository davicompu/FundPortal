using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace MvcWebRole.Controllers
{
    public class HomeController : Controller
    {
        public ActionResult Index()
        {
            return View();
        }

        [AllowAnonymous]
        public ActionResult NotAuthorized()
        {
            return View();
        }

        [AllowAnonymous]
        public ActionResult CookiesRequired()
        {
            return View();
        }

        [AllowAnonymous]
        public ActionResult Logout()
        {
            DotNetCasClient.CasAuthentication.SingleSignOut();
            return RedirectToAction("Index");
        }
    }
}
