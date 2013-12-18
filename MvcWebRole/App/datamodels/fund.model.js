define(['datacontexts/fileupload.datacontext'],
    function (fileUploadDatacontext) {

        var datamodel = {
            Item: Fund,
        };

        return datamodel;

        function Fund(data) {

            var self = this;
            data = data || {};

            //#region Persisted properties.
            self.Id = data.Id;
            self.AreaId = data.AreaId;
            self.Number = ko.observable(data.Number).extend({ required: true });
            self.DateTimeCreated = data.DateTimeCreated || new Date();
            self.DateTimeEdited = data.DateTimeEdited || [];
            self.Title = ko.observable(data.Title).extend({ required: true });
            self.Status = ko.observable(data.Status);
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

            
            //#region Non-persisted properties.
            // TODO: Remove on save to reduce unneccesary over-posting.
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
            self.fundStatusText = ko.computed(function () {
                switch (parseInt(self.Status(), 10)) {
                    case 1:
                        return 'Draft';
                    case 2:
                        return 'Final';
                    default:
                        return 'Status error';
                }
            });
            self.formattedCurrentBudget = ko.observable(data.CurrentBudget || 0)
                .extend({ currency: [0, self.CurrentBudget] });
            self.formattedProjectedExpenditures = ko.observable(data.ProjectedExpenditures || 0)
                .extend({ currency: [0, self.ProjectedExpenditures] });
            self.formattedBudgetAdjustment = ko.observable(data.BudgetAdjustment || 0)
                .extend({ currency: [0, self.BudgetAdjustment] });
            self.formattedRequestedBudget = ko.observable(self.requestedBudget())
                .extend({ currency: [0] });
            self.formattedProjectedYearEndBalance = ko.observable(self.projectedYearEndBalance())
                .extend({ currency: [0] });
            self.formattedVariance = ko.observable(self.variance())
                .extend({ currency: [0] });
            //#endregion

            //#region Non-persisted functions.
            self.requestedBudget.subscribe(function (newValue) {
                self.formattedRequestedBudget(newValue);
            });
            self.projectedYearEndBalance.subscribe(function (newValue) {
                self.formattedProjectedYearEndBalance(newValue);
            });
            self.variance.subscribe(function (newValue) {
                self.formattedVariance(newValue);
            });
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