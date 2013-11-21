﻿define(['services/logger', 'plugins/router', 'datacontexts/area.datacontext',
    'datacontexts/fund.datacontext'],
    function (logger, router, areaDatacontext, fundDatacontext) {
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
            grandTotals: ko.observable(new GrandTotals()),
            //#endregion

            //#region Methods.
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
                [formatCurrency]);
        }

        function getSubtotalsForArea(area) {
            return fundDatacontext.getFundSubtotalsForArea(
                area.subtotals,
                vm.error,
                'getfundsubtotalsbyarea',
                {
                    areaId: area.Id
                },
                [getGrandTotals, formatCurrency]);
        }

        function getGrandTotals(areaSubtotals) {
            // Don't add 'Other uses of funds' subtotals to grand total
            if (areaSubtotals.Id !== areaDatacontext.otherUsesOfFundsId()) {
                vm.grandTotals().currentBudget(vm.grandTotals().currentBudget()
                    + areaSubtotals.currentBudget());
                vm.grandTotals().projectedExpenditures(vm.grandTotals().projectedExpenditures()
                    + areaSubtotals.projectedExpenditures());
                vm.grandTotals().requestedBudget(vm.grandTotals().requestedBudget()
                    + (areaSubtotals.currentBudget() + areaSubtotals.budgetAdjustment()));
                vm.grandTotals().variance(vm.grandTotals().variance()
                    + (areaSubtotals.currentBudget() - areaSubtotals.requestedBudget()));
            }
        }

        function formatCurrency(config) {
            $('.currency').formatCurrency({ colorize: false, roundToDecimalPlace: 0 });
        }

        function GrandTotals(data) {
            var self = this;
            data = data || {};

            self.currentBudget = ko.observable(0);
            self.projectedExpenditures = ko.observable(0);
            self.requestedBudget = ko.observable(0);
            self.variance = ko.observable(0);
        }
        //#endregion
    });