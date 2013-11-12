using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using MongoRepository;

namespace FundEntities
{
    [JsonObject(MemberSerialization.OptOut)]
    public class FileUpload
    {
        public string Id { get; set; }

        public DateTimeOffset DateTimeCreated { get; set; }

        public string Source { get; set; }

        public string ContentType { get; set; }

        public string OriginalFileName { get; set; }
    }
}
