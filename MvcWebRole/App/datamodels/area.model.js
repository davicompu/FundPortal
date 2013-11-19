﻿define([],
    function () {

        var datamodel = {
            Item: Area,
            ItemSubtotals: AreaSubtotals,
        };

        return datamodel;

        function Area(data) {

            var self = this;
            data = data || {};

            //#region Persisted properties
            self.Id = data.Id;
            self.Number = ko.observable(data.Number).extend({ required: true });
            self.Name = ko.observable(data.Name).extend({ required: true });
            //#endregion

            //#region Non-persisted properties
            self.errorMessage = ko.observable();
            self.funds = ko.observableArray([]);
            self.subtotals = ko.observable();
            //#endregion

            //#region Public methods
            self.toJson = function () { return ko.toJSON(self); };
            //#endregion
        }

        function AreaSubtotals(data) {
            var self = this;
            data = data || {};

            self.Id = data._id;
            self.currentBudget = ko.observable(data.currentBudget || 0);
            self.projectedExpenditures = ko.observable(data.projectedExpenditures || 0);
            self.budgetAdjustment = ko.observable(data.budgetAdjustment || 0);
            self.requestedBudget = ko.computed(function () {
                return self.currentBudget() + self.budgetAdjustment();
            });
            self.variance = ko.computed(function () {
                return self.currentBudget() - self.requestedBudget();
            });
        }
    });