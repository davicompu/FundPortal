using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Newtonsoft.Json;
using MongoRepository;

namespace FundEntities
{
    // TODO: Server-side validation
    [JsonObject(MemberSerialization.OptOut)]
    public class Fund : Entity
    {
        public string AreaId { get; set; }

        public string Number { get; set; }
        
        public DateTimeOffset DateTimeCreated { get; set; }

        public ICollection<DateTimeOffset> DateTimeEdited { get; set; }

        public string Title { get; set; }

        public Status Status { get; set; }

        public string Description { get; set; }

        public string ResponsiblePerson { get; set; }

        public int CurrentBudget { get; set; }

        public int ProjectedExpenditures { get; set; }

        public int BudgetAdjustment { get; set; }

        [ConditionallyRequireNote("BudgetAdjustment", 3)]
        public string BudgetAdjustmentNote { get; set; }

        public int FiscalYear { get; set; }

        public ICollection<FileUpload> FileUploads { get; set; }
    }
}
