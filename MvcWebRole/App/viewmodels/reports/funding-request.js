define(['services/logger', 'plugins/router', 'datacontexts/area.datacontext',
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
            return $.each(vm.items(), function (index, value) {
                getFundsForArea(value);
            });
        }

        function getFundsForArea(area) {
            return fundDatacontext.getItems(
                area.funds,
                vm.error,
                'getbyarea',
                {
                    areaId: area.Id
                });
        }
        //#endregion
    });