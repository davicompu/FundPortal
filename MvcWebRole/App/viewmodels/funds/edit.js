define(['services/logger', 'plugins/router', 'datacontexts/fund.datacontext',
    'viewmodels/funds/browse'],
    function (logger, router, datacontext, browseVM) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'EDIT FUND',
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
            logger.log('Edit fund view activated', null, 'funds/edit', false);
            getFund(id);
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.item(undefined);
            return true;
        }

        function getFund(id) {
            ko.utils.arrayFirst(browseVM.items(), function (item) {
                if (item.Id === id) {
                    return vm.item(item);
                }
            });

            if (undefined == vm.item()) {
                return datacontext.getItem(id, vm.item, vm.error);
            }
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
            browseVM.items.push(datacontext.createItem(changedItem));
            browseVM.updateNoItemsToShowProperty();
        }

        function navigateToBrowseView(newItem) {
            router.navigate('#/funds/browse');
        }

        //#endregion
    });