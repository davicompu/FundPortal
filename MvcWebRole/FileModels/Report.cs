using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;

namespace MvcWebRole.FileModels
{
    public abstract class Report
    {
        public byte[] BinaryData { get; set; }
        public string FileType { get; set; }
        public string FileName { get; set; }
    }
}