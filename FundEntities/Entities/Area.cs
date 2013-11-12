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
    public class Area : Entity
    {
        public string Number { get; set; }

        public string Name { get; set; }
    }
}
