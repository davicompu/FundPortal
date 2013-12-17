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
    public class ReportFileController : Controller
    {
        private MongoRepository<Area> areaRepository = new MongoRepository<Area>();
        private MongoRepository<Fund> fundRepository = new MongoRepository<Fund>();

        //
        // GET: /ReportFile/FundingRequest
        public ActionResult FundingRequest()
        {
            var accessibleAreas = GetAreaAccessForCurrentUser();

            if (accessibleAreas.Count > 0)
            {
                var areas = areaRepository
                    .Where(a => accessibleAreas.Contains(a.Id))
                    .OrderBy(a => a.Number);

                var funds = fundRepository
                    .Where(f => accessibleAreas.Contains(f.AreaId))
                    .OrderBy(f => f.Number);

                var report = new FundingRequestReport(areas, funds);

                return File(report.BinaryData, report.FileType, report.FileName);
            }
            return RedirectToAction("NotAuthorized", "Home");
        }

        #region Helpers
        private bool CanModifyFund(Fund fund)
        {
            if (fund.Status.CompareTo(Status.Draft) == 0)
            {
                return true;
            }

            if (User.IsInRole("MANAGE-FUNDS"))
            {
                return true;
            }

            return false;
        }

        public bool CanAccessArea(Area area)
        {
            string role = "EDIT-" + area.Number;

            if (User.IsInRole(role))
            {
                return true;
            }

            return false;
        }

        public HashSet<string> GetAreaAccessForCurrentUser()
        {
            var areaAccessList = new HashSet<string>();

            foreach (var area in areaRepository)
            {
                if (CanAccessArea(area))
                {
                    areaAccessList.Add(area.Id);
                }
            }
            return areaAccessList;
        }
        #endregion
    }
}
