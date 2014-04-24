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
        private MongoRepository<Fund> fundRepository = new MongoRepository<Fund>();

        //
        // GET: /ReportFile/FundingRequest
        [GetAreasActionFilter]
        public ActionResult FundingRequest(List<Area> areas = null)
        {
            if (areas.Count > 0)
            {
                var funds = fundRepository
                    .Where(f => areas.Any(a => a.Id == f.AreaId))
                    .OrderBy(f => f.Number);

                var report = new FundingRequestReport(areas, funds);

                return File(report.BinaryData, report.FileType, report.FileName);
            }
            return RedirectToAction("NotAuthorized", "Home");
        }
    }
}