define(['services/logger', 'plugins/router', 'datacontexts/fund.datacontext',
    'datacontexts/area.datacontext'],
    function (logger, router, datacontext, areaDatacontext) {

        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'MANAGE FUNDS',
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
            selectItem: selectItem,
            deleteSelectedItems: deleteSelectedItems,
            //#endregion
        };

        vm.selectedAreaId.subscribe(function (newValue) {
            getItems('getbyarea');
        });

        return vm;

        //#region Internal methods.
        function activate() {
            logger.log('Manage funds view activated', null, 'funds/manage', false);
            ga('send', 'pageview', { 'page': window.location.href, 'title': document.title });
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
                    id: vm.selectedAreaId(),
                },
                [updateNoItemsToShowProperty]);
        }

        function updateNoItemsToShowProperty() {
            if (vm.items().length === 0) {
                return vm.noItemsToShow(true);
            }
            return vm.noItemsToShow(false);
        }

        function selectItem(item) {
            item.destroy(!item.destroy());
        }

        function deleteSelectedItems() {
            var deleteCount = 0;
            $.each(vm.items(), function (index, value) {
                if (value.destroy()) {
                    ++deleteCount;
                }
            });

            if (deleteCount) {
                if (confirm("Are you sure you want to delete your selection?")) {
                    $.each(vm.items(), function (index, value) {
                        if (value.destroy()) {
                            deleteItem(value);
                        }
                    });
                }
            } else {
                alert("Select funds for deletion by clicking on them and then "
                    + "clicking the trash icon.");
            }
        }

        function deleteItem(item) {
            return datacontext.deleteItem(
                item,
                [removeItem, updateNoItemsToShowProperty]
                );
        }

        function removeItem(item) {
            vm.items.remove(item);
        }
        //#endregion
    });