﻿define(['services/logger', 'plugins/router', 'datacontexts/fund.datacontext',
    'datacontexts/fileupload.datacontext', 'viewmodels/funds/browse'],
    function (logger, router, datacontext, fileuploadDatacontext, browseVM) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'NEW FUND',
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
        function activate(queryString) {
            logger.log('Create fund view activated', null, 'funds/create', false);
            vm.item(datacontext.createItem({
                AreaId: queryString.areaid
            }));
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.item(undefined);
            return true;
        }

        function postFiles(data, evt) {
            fileuploadDatacontext.saveNewItem(data, evt, vm.item().FileUploads, vm.error);
        }

        function removeFileUpload(item) {
            var indexOfUpload = vm.item().FileUploads.indexOf(item);

            // Mark upload item for removal when parent item is saved.
            vm.item().FileUploads()[indexOfUpload].destroy(true);
        }

        // TODO: Client-side validation.
        function saveItem(item) {
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

            datacontext.saveNewItem(
                item,
                [addNewItemToBrowseVM, navigateToBrowseView]);
        }

        function addNewItemToBrowseVM(newItem) {
            browseVM.items.push(datacontext.createItem(newItem));
            browseVM.updateNoItemsToShowProperty();
        }

        function navigateToBrowseView(newItem) {
            router.navigate('#/funds/browse');
        }

        //#endregion
    });