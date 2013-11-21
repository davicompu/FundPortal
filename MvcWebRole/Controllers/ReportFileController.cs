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
            // TODO: Access control
            var areas = areaRepository;
            var funds = fundRepository;

            var report = new FundingRequestReport(areas, funds);

            return File(report.BinaryData, report.FileType, report.FileName);
        }
    }
}
