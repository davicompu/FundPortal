define(['services/logger', 'plugins/router', 'datacontexts/area.datacontext',
    'viewmodels/areas/browse'],
    function (logger, router, datacontext, browseVM) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'EDIT AREA',
            activate: activate,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            item: ko.observable(),
            //#endregion

            //#region Methods.
            saveItem: saveItem,
            //#endregion
        };

        return vm;

        //#region Internal methods.
        function activate(id) {
            logger.log('Edit area view activated', null, 'areas/edit', false);
            getArea(id);
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.item(undefined);
            return true;
        }

        function getArea(id) {
            if (router.activeItem()) {
                var activeModule = router.activeItem().__moduleId__;
                if (undefined !== browseVM.items()) {
                    ko.utils.arrayFirst(browseVM.items(), function (item) {
                        if (item.Id === id) {
                            return vm.item(item);
                        }
                    });
                }
            }
            return datacontext.getItem(id, vm.item, vm.error);
        }

        // TODO: Client-side validation
        function saveItem(item) {
            datacontext.saveChangedItem(
                item,
                [updateChangedItemInBrowseVM, navigateToBrowseView]);
            }

        function updateChangedItemInBrowseVM(changedItem) {
            browseVM.items.remove(function (item) {
                return item.Id === changedItem.Id;
            });
            browseVM.items.push(changedItem);
        }

        function navigateToBrowseView(newItem) {
            router.navigate('#/areas/browse');
        }

        //#endregion
    });