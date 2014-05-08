using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;
using FundEntities;
using MongoRepository;
using MvcWebRole.FileModels;
using MvcWebRole.Filters;

namespace MvcWebRole.Controllers
{
    public class ReportFileController : Controller
    {
        private MongoRepository<Area> areaRepository = new MongoRepository<Area>();
        private MongoRepository<Fund> fundRepository = new MongoRepository<Fund>();

        //
        // GET: /ReportFile/FundingRequest
        [GetAreasMvcActionFilter]
        public ActionResult FundingRequest(HashSet<string> accessibleAreas = null)
        {
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
    }
}