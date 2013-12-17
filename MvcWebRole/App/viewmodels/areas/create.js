define(['services/logger', 'plugins/router', 'datacontexts/area.datacontext',
    'viewmodels/areas/browse'],
    function (logger, router, datacontext, browseVM) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'NEW AREA',
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
        function activate() {
            logger.log('Create area view activated', null, 'areas/create', false);
            vm.item(datacontext.createItem({}));
            vm.errors = ko.validation.group(vm.item());
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.item(undefined);
            return true;
        }

        function saveItem(item) {
            if (vm.errors().length === 0) {
                datacontext.saveNewItem(
                item,
                [
                    addNewItemToBrowseVM,
                    navigateToBrowseView,
                    clearItems
                ]);
            } else {
                vm.errors.showAllMessages();
            }
        }

        function addNewItemToBrowseVM(newItem) {
            browseVM.items.push(newItem);
        }

        function navigateToBrowseView(changedItem) {
            router.navigate('#/areas/browse');
        }

        function clearItems() {
            vm.item(undefined);
        }
        //#endregion
    });