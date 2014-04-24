define(['services/logger', 'plugins/router', 'datacontexts/user.datacontext',
    'viewmodels/users/browse'],
    function (logger, router, datacontext, browseVM) {
        var vm = {
            //#region Initialization
            activate: activate,
            deactivate: deactivate,
            title: 'NEW USER',
            error: ko.observable(),
            //#endregion

            //#region Properties
            item: ko.observable(),
            showBackButton: ko.observable(true),
            //#endregion

            //#region Methods
            saveItem: saveItem,
            //#endregion
        };

        return vm;

        //#region Internal Methods
        function activate() {
            logger.log('New user view activated', null, 'users/create', false);
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
            router.navigate('#/users/browse');
        }

        function clearItems() {
            vm.item(undefined);
        }
        //#endregion
    });