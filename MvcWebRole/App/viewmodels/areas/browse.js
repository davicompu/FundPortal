define(['services/logger', 'plugins/router', 'datacontexts/area.datacontext'],
    function (logger, router, datacontext) {

        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'AREAS',
            activate: activate,
            attached: attached,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            items: ko.observableArray([]),
            noItemsToShow: ko.observable(true),
            removeItems: ko.observable(false),
            //#endregion

            //#region Methods.
            toggleRemoveItems: toggleRemoveItems,
            selectItem: selectItem,
            updateNoItemsToShowProperty: updateNoItemsToShowProperty,
            //#endregion
        };

        return vm;

        //#region Internal methods.
        function activate() {
            logger.log('Browse areas view activated', null, 'areas/browse', false);
            ga('send', 'pageview', { 'page': window.location.href, 'title': document.title });
            return true;
        }

        function attached() {
            getItems('get');
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.removeItems(false);
            return true;
        }

        function getItems(action) {
            return datacontext.getItems(
                vm.items,
                vm.error,
                action,
                null,
                [updateNoItemsToShowProperty]);
        }

        function updateNoItemsToShowProperty() {
            if (vm.items().length === 0) {
                return vm.noItemsToShow(true);
            }
            return vm.noItemsToShow(false);
        }

        function toggleRemoveItems() {
            return vm.removeItems(!vm.removeItems());
        }

        function selectItem(item) {
            if (vm.removeItems()) {
                if (confirm('Are you sure you want to delete this item?')) {
                    return deleteItem(item);
                }
            } else {
                return router.navigate('#/areas/edit/' + item.Id);
            }
        }

        function deleteItem(item) {
            return datacontext.deleteItem(item,
                [removeDeletedItemsFromView, updateNoItemsToShowProperty]);
        }

        function removeDeletedItemsFromView(item) {
            return vm.items.remove(item);
        }
        //#endregion
    });