define(['services/logger', 'plugins/router', 'datacontexts/user.datacontext'],
    function (logger, router, userDatacontext) {
        var vm = {
            //#region Properties
            activate: activate,
            deactivate: deactivate,
            title: 'USERS',
            error: ko.observable(),
            //#endregion

            //#region Properties
            items: ko.observableArray([]),
            noItemsToShow: ko.observable(true),
            removeItems: ko.observable(false),
            showBackButton: ko.observable(false),
            //#endregion

            //#region Methods
            selectItem: selectItem,
            toggleRemoveItems: toggleRemoveItems,
            updateNoItemsToShowProperty: updateNoItemsToShowProperty,
            //#endregion
        };

        return vm;

        //#region Internal Methods
        function activate() {
            logger.log('Browse users view activated', null, 'users/browse', false);
            getItems('get');
            ga('send', 'pageview', { 'page': window.location.href, 'title': document.title });
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.removeItems(false);
            return true;
        }

        function clearItems() {
            vm.items([]);
        }

        function getItems(action) {
            userDatacontext.getItems(
                vm.items,
                vm.error,
                action,
                null,
                [updateNoItemsToShowProperty]
            );
        }

        function updateNoItemsToShowProperty() {
            if (vm.items().length === 0) {
                return vm.noItemsToShow(true);
            }
            return vm.noItemsToShow(false);
        }

        function selectItem(item) {
            if (vm.removeItems()) {
                if (confirm("Are you sure you want to delete this item?")) {
                    deleteItem(item);
                    return false;
                } else {
                    return false;
                }
            } else {
                return router.navigate('users/edit/' + item.Id);
            }
        }

        function deleteItem(item) {
            return userDatacontext.deleteItem(
                item,
                [removeItem, updateNoItemsToShowProperty]);
        }

        function toggleRemoveItems() {
            vm.removeItems(!vm.removeItems());
        }

        function removeItem(item) {
            vm.items.remove(item);
        }
        //#endregion
    });