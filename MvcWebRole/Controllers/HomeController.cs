using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using FundEntities;
using MongoRepository;
using MvcWebRole.FileModels;

namespace MvcWebRole.Controllers
{
    public class HomeController : Controller
    {
        private MongoRepository<Area> areaRepository = new MongoRepository<Area>();
        private MongoRepository<Fund> fundRepository = new MongoRepository<Fund>();

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
