define(['datacontexts/fileupload.datacontext'],
    function (fileUploadDatacontext) {

        var datamodel = {
            Item: Fund,
        };

        return datamodel;

        function Fund(data) {

            var self = this;
            data = data || {};

            //#region Persisted properties
            self.Id = data.Id;
            self.AreaId = data.AreaId;
            self.Number = ko.observable(data.Number).extend({ required: true });
            self.DateTimeCreated = data.DateTimeCreated || new Date();
            self.DateTimeEdited = data.DateTimeEdited || [];
            self.Title = ko.observable(data.Title).extend({ required: true });
            self.Status = data.Status;
            self.Description = ko.observable(data.Description).extend({ required: true });
            self.ResponsiblePerson = ko.observable(data.ResponsiblePerson).extend({ required: true });
            self.CurrentBudget = ko.observable(data.CurrentBudget || 0)
                .extend({ required: true, numeric: 0 });
            self.ProjectedExpenditures = ko.observable(data.ProjectedExpenditures || 0)
                .extend({ required: true, numeric: 0 });
            self.BudgetAdjustment = ko.observable(data.BudgetAdjustment || 0)
                .extend({ required: true, numeric: 0 });
            self.BudgetAdjustmentNote = ko.observable(data.BudgetAdjustmentNote)
                .extend({
                    required: {
                        onlyIf: function () {
                            return self.BudgetAdjustment() > 0;
                        },
                        message: 'This field is required when there is a budget adjustment.'
                    }
                });
            self.FiscalYear = data.FiscalYear;
            self.FileUploads = initFiles(self, data.FileUploads);
            //#endregion

            //#region Non-persisted properties
            self.errorMessage = ko.observable();
            self.requestedBudget = ko.computed(function () {
                return self.CurrentBudget() + self.BudgetAdjustment();
            });
            self.projectedYearEndBalance = ko.computed(function () {
                return self.CurrentBudget() - self.ProjectedExpenditures();
            });
            self.variance = ko.computed(function () {
                return self.CurrentBudget() - self.requestedBudget();
            });
            self.statusText = ko.computed(function () {
                switch (self.Status) {
                    case 1:
                        return 'Draft';
                    case 2:
                        return 'Final';
                    default:
                        return 'Status error';
                }
            });
            //#endregion

            //#region Non-persisted properties
            self.toJson = function () { return ko.toJSON(self); };
            //#endregion
        }

        function initFiles(fund, fileData) {
            var fileArray = ko.observableArray([]);

            if (fileData) {
                $.each(fileData, function (index, value) {
                    fileArray.push(fileUploadDatacontext.createItem(value));
                });
            }
            return fileArray;
        }
    });