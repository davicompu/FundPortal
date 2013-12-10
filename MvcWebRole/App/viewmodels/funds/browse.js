define(['services/logger', 'plugins/router', 'datacontexts/fund.datacontext',
    'datacontexts/area.datacontext', 'services/sorter'],
    function (logger, router, datacontext, areaDatacontext, sorter) {

        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'FUNDS',
            activate: activate,
            attached: attached,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            areas: ko.observableArray([]),
            selectedAreaId: ko.observable(),
            items: ko.observableArray([]),
            noItemsToShow: ko.observable(true),
            //#endregion

            //#region Methods.
            navigateToCreateView: navigateToCreateView,
            updateNoItemsToShowProperty: updateNoItemsToShowProperty,
            sort: sort,
            //#endregion
        };

        vm.selectedAreaId.subscribe(function (newValue) {
            getItems('getbyarea');
        });

        return vm;

        //#region Internal methods.
        function activate() {
            logger.log('Browse funds view activated', null, 'funds/browse', false);
            return true;
        }

        function attached() {
            getAreas('get');
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            return true;
        }

        function getAreas(action) {
            return areaDatacontext.getItems(
                vm.areas,
                vm.error,
                action,
                null,
                [initSelectedArea]);
        }

        function initSelectedArea(areas) {
            vm.selectedAreaId(areas[0].Id);
        }

        function getItems(action) {
            return datacontext.getItems(
                vm.items,
                vm.error,
                action,
                {
                    areaId: vm.selectedAreaId(),
                },
                [updateNoItemsToShowProperty]);
        }

        function updateNoItemsToShowProperty() {
            if (vm.items().length === 0) {
                return vm.noItemsToShow(true);
            }
            return vm.noItemsToShow(false);
        }

        function navigateToCreateView() {
            return router.navigate('#/funds/create?areaid=' + vm.selectedAreaId());
        }

        function sort(fieldName) {
            sorter.sort(vm.items, fieldName);
        }
        //#endregion
    });