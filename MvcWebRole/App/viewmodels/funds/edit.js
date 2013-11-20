define(['services/logger', 'plugins/router', 'datacontexts/fund.datacontext',
    'datacontexts/fileupload.datacontext', 'viewmodels/funds/browse'],
    function (logger, router, datacontext, fileuploadDatacontext, browseVM) {
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
            postFiles: postFiles,
            saveItem: saveItem,
            removeFileUpload: removeFileUpload,
            //#endregion
        };

        return vm;

        //#region Internal methods.
        function activate(id) {
            logger.log('Edit fund view activated', null, 'funds/edit', false);
            getFund(id);
            //vm.errors = ko.validation.group(vm.item());
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.item(undefined);
            return true;
        }

        function getFund(id) {
            // Try to get item from the BrowseVM, if initialized.
            ko.utils.arrayFirst(browseVM.items(), function (item) {
                if (item.Id === id) {
                    return vm.item(item);
                }
            });

            // If item wasn't retrieved from BrowseVM, retrieve from DB.
            if (undefined === vm.item()) {
                return datacontext.getItem(id, vm.item, vm.error);
            }
        }

        function postFiles(data, evt) {
            fileuploadDatacontext.saveNewItem(data, evt, vm.item().FileUploads, vm.error);
        }

        function removeFileUpload(item) {
            if (confirm('Are you sure you want to delete this item?')) {
                var indexOfUpload = vm.item().FileUploads.indexOf(item);

                // Mark upload item for removal when parent item is saved.
                vm.item().FileUploads()[indexOfUpload].destroy(true);
            }
        }

        // TODO: Client-side validation
        function saveItem(item) {
            if (vm.errors().length === 0) {
                // Remove uploads with errors.
                var uploadItemsWithErrors = item.FileUploads.remove(function (uploadItem) {
                    return uploadItem.errorMessage();
                });

                // Remove uploads marked with destroy.
                var removedUploadItems = item.FileUploads.remove(function (uploadItem) {
                    return uploadItem.destroy();
                });

                // Delete removed files from server.
                $.each(removedUploadItems, function (index, value) {
                    fileuploadDatacontext.deleteItem(value);
                });

                datacontext.saveChangedItem(
                    item,
                    [updateChangedItemInBrowseVM, navigateToBrowseView]);
            } else {
                vm.errors.showAllMessages();
            }
        }

        function updateChangedItemInBrowseVM(changedItem) {
            // Remove the changed item from the BrowseVM, if initialized.
            browseVM.items.remove(function (item) {
                return item.Id === changedItem.Id;
            });

            // Add the item back to the BrowseVM reflecting the changes.
            browseVM.items.push(datacontext.createItem(changedItem));

            browseVM.updateNoItemsToShowProperty();
        }

        function navigateToBrowseView(newItem) {
            router.navigate('#/funds/browse');
        }

        //#endregion
    });