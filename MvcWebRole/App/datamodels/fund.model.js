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
            self.Number = data.Number;
            self.DateTimeCreated = data.DateTimeCreated || new Date();
            self.DateTimeEdited = data.DateTimeEdited || [];
            self.Title = data.Title;
            self.Status = data.Status;
            self.Description = data.Description;
            self.ResponsiblePerson = data.ResponsiblePerson;
            self.CurrentBudget = ko.observable(data.CurrentBudget || 0);
            self.ProjectedExpenditures = ko.observable(data.ProjectedExpenditures || 0);
            self.BudgetAdjustment = ko.observable(data.BudgetAdjustment || 0);
            self.BudgetAdjustmentNote = data.BudgetAdjustmentNote;
            self.FiscalYear = data.FiscalYear;
            self.FileUploads = initFiles(self, data.FileUploads);
            //#endregion

            //#region Non-persisted properties
            self.errorMessage = ko.observable();
            self.requestedBudget = ko.computed(function () {
                return parseFloat(self.CurrentBudget()) + parseFloat(self.BudgetAdjustment());
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