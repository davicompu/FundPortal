using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using MongoRepository;
using System.ComponentModel.DataAnnotations;

namespace FundEntities
{
    [JsonObject(MemberSerialization.OptOut)]
    public class Area : Entity
    {
        [Required]
        public string Number { get; set; }

        [Required]
        public string Name { get; set; }
    }
}
