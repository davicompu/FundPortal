﻿define(['services/logger', 'plugins/router', 'datacontexts/area.datacontext',
    'datacontexts/fund.datacontext', 'services/sorter'],
    function (logger, router, areaDatacontext, fundDatacontext, sorter) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'FUNDING REQUEST REPORT',
            activate: activate,
            attached: attached,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            items: ko.observableArray(),
            oAreaFunds: ko.observableArray(),
            grandTotals: ko.observable(new GrandTotals()),
            //#endregion

            //#region Methods.
            sortByNumber: sortByNumber,
            sortByTitle: sortByTitle,
            sortByResponsiblePerson: sortByResponsiblePerson,
            sortByCurrentBudget: sortByCurrentBudget,
            sortByProjectedExpenditures: sortByProjectedExpenditures,
            sortByRequestedBudget: sortByRequestedBudget,
            sortByVariance: sortByVariance,
            //#endregion
        };

        return vm;

        //#region Internal methods.
        function activate() {
            logger.log('Funding request report view activated', null, 'reports/funding-request', false);
            getItems();
            return true;
        }

        function attached() {
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            return true;
        }

        function getItems() {
            return areaDatacontext.getItems(
                vm.items,
                vm.error,
                'get',
                null,
                [getFundDataForAreas]);
        }

        function getFundDataForAreas(areas) {
            $.each(vm.items(), function (index, value) {
                getFundsForArea(value);
                getSubtotalsForArea(value);
            });
            
        }

        function getFundsForArea(area) {
            return fundDatacontext.getItems(
                area.funds,
                vm.error,
                'getbyarea',
                {
                    areaId: area.Id
                },
                []);
        }

        function getSubtotalsForArea(area) {
            return fundDatacontext.getFundSubtotalsForArea(
                area.subtotals,
                vm.error,
                'getfundsubtotalsbyarea',
                {
                    areaId: area.Id
                },
                [getGrandTotals]);
        }

        function getGrandTotals(areaSubtotals) {
            // Don't add 'Other uses of funds' subtotals to grand total.
            if (areaSubtotals.Id !== areaDatacontext.otherUsesOfFundsId()) {
                vm.grandTotals().currentBudget(vm.grandTotals().currentBudget() +
                    areaSubtotals.currentBudget());
                vm.grandTotals().projectedExpenditures(vm.grandTotals().projectedExpenditures() +
                    areaSubtotals.projectedExpenditures());
                vm.grandTotals().requestedBudget(vm.grandTotals().requestedBudget() +
                    (areaSubtotals.currentBudget() + areaSubtotals.budgetAdjustment()));
                vm.grandTotals().variance(vm.grandTotals().variance() +
                    (areaSubtotals.currentBudget() - areaSubtotals.requestedBudget()));
            }
        }

        function GrandTotals(data) {
            var self = this;
            data = data || {};

            self.currentBudget = ko.observable(0);
            self.projectedExpenditures = ko.observable(0);
            self.requestedBudget = ko.observable(0);
            self.variance = ko.observable(0);

            self.formattedCurrentBudget = ko.observable(data.currentBudget || 0)
                .extend({ currency: [0, self.CurrentBudget] });
            self.formattedProjectedExpenditures = ko.observable(data.projectedExpenditures || 0)
                .extend({ currency: [0, self.ProjectedExpenditures] });
            self.formattedRequestedBudget = ko.observable(self.requestedBudget())
                .extend({ currency: [0] });
            self.formattedVariance = ko.observable(self.variance())
                .extend({ currency: [0] });

            self.currentBudget.subscribe(function (newValue) {
                self.formattedCurrentBudget(newValue);
            });
            self.projectedExpenditures.subscribe(function (newValue) {
                self.formattedProjectedExpenditures(newValue);
            });
            self.requestedBudget.subscribe(function (newValue) {
                self.formattedRequestedBudget(newValue);
            });
            self.variance.subscribe(function (newValue) {
                self.formattedVariance(newValue);
            });
        }

        function sortByNumber() {
            $.each(vm.items(), function (index, value) {
                sorter.sortByNumber(value.funds);
            });
        }

        function sortByTitle() {
            $.each(vm.items(), function (index, value) {
                sorter.sortByTitle(value.funds);
            });
        }

        function sortByResponsiblePerson() {
            $.each(vm.items(), function (index, value) {
                sorter.sortByResponsiblePerson(value.funds);
            });
        }

        function sortByCurrentBudget() {
            $.each(vm.items(), function (index, value) {
                sorter.sortByCurrentBudget(value.funds);
            });
        }

        function sortByProjectedExpenditures() {
            $.each(vm.items(), function (index, value) {
                sorter.sortByProjectedExpenditures(value.funds);
            });
        }

        function sortByRequestedBudget() {
            $.each(vm.items(), function (index, value) {
                sorter.sortByRequestedBudget(value.funds);
            });
        }

        function sortByVariance() {
            $.each(vm.items(), function (index, value) {
                sorter.sortByVariance(value.funds);
            });
        }
        //#endregion
    });