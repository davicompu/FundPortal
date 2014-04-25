define(['services/logger', 'plugins/router', 'datacontexts/fund.datacontext',
    'datacontexts/fileupload.datacontext', 'viewmodels/funds/browse',
    'datacontexts/comment.datacontext', 'global/session'],
    function (logger, router, datacontext, fileuploadDatacontext, browseVM,
        commentDatacontext, session) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'EDIT FUND',
            activate: activate,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            fundId: ko.observable(),
            item: ko.observable(),
            comments: ko.observableArray([]),
            newComment: ko.observable(),
            //#endregion

            //#region Methods.
            initComment: initComment,
            postFiles: postFiles,
            saveComment: saveComment,
            saveItem: saveItem,
            removeFileUpload: removeFileUpload,
            //#endregion
        };

        vm.item.subscribe(function (newValue) {
            if (newValue !== undefined) {
                vm.errors = ko.validation.group(newValue);
            }
        });

        return vm;

        //#region Internal methods.
        function activate(id) {
            logger.log('Edit fund view activated', null, 'funds/edit', false);
            vm.fundId(id);
            getFund(id);
            getComments(id);
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

        function getComments(fundId) {
            return commentDatacontext.getItems(
                vm.comments,
                vm.error,
                'get',
                { id: fundId });
        }

        function initComment() {
            return vm.newComment(new commentDatacontext.createItem({FundId: vm.fundId()}));
        }

        function saveComment(comment) {
            return commentDatacontext.saveNewItem(comment)
                .done(function (result) {
                    vm.newComment(undefined);
                    vm.comments.push(new commentDatacontext.createItem(result));
                });
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