define(['datamodels/area.model', 'services/contexthelper'],
    function (model, contextHelper) {
        //#region Public api.
        var datacontext = {
            createItem: createItem,
            getItem: getItem,
            getItems: getItems,
            saveNewItem: saveNewItem,
            saveChangedItem: saveChangedItem,
            deleteItem: deleteItem,
            otherUsesOfFundsId: ko.observable(),
        };

        return datacontext;
        //#endregion

        //#region Publicly accessible methods.
        function createItem(data) {
            return new model.Item(data);
        }

        function getItem(id, itemObservable, errorObservable) {
            return contextHelper.ajaxRequest('get', itemApi('get', id))
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                itemObservable(new createItem(result));
            }

            function getFailed(result) {
                itemObservable(undefined);
                errorObservable('An error occurred during your request: '
                    + result.statusText);
            }
        }

        function getItems(itemObservableArray, errorObservable, action, data, successFunctions) {
            return contextHelper.ajaxRequest('get', itemApi(action), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                var mappedItems = $.map(result, function (item) {
                    // Note 'Other uses of funds' Id
                    if (item.Number === 'O') {
                        datacontext.otherUsesOfFundsId(item.Id);
                    }
                    return new createItem(item);
                });
                itemObservableArray(mappedItems);

                $.each(successFunctions || [], function (index, value) {
                    value(mappedItems);
                });
            }

            function getFailed(result) {
                itemObservableArray(undefined);
                errorObservable('An error occurred during your request: '
                    + result.statusText);
            }
        }

        function saveNewItem(data, successFunctions) {
            contextHelper.clearErrorMessage(data);
            return contextHelper.ajaxRequest('post', itemApi('post'), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                $.each(successFunctions || [], function (index, value) {
                    value(result);
                });
            }

            function getFailed(result) {
                var errorText = 'Error adding the new item: ' +
                    result.statusText + '.';
                data.errorMessage(contextHelper.getModelStateErrors(JSON.parse(result.responseText), errorText));
            }
        }

        function saveChangedItem(data, successFunctions) {
            contextHelper.clearErrorMessage(data);
            return contextHelper.ajaxRequest('put', itemApi('put', data.Id), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                $.each(successFunctions || [], function (index, value) {
                    value(result);
                });
            }

            function getFailed(result) {
                var errorText = 'Error adding the new item: ' +
                    result.statusText + '.';
                data.errorMessage(contextHelper.getModelStateErrors(JSON.parse(result.responseText), errorText));
            }
        }

        function deleteItem(data, successFunctions) {
            contextHelper.clearErrorMessage(data);
            return contextHelper.ajaxRequest('delete', itemApi('delete', data.Id))
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded() {
                $.each(successFunctions || [], function (index, value) {
                    value();
                });
            }

            function getFailed(result) {
                data.errorMessage('Error deleting the item: ' +
                    result.statusText);
            }
        }
        //#endregion

        //#region Private properties.
        // Routes.
        function itemApi(action, id) { return '/api/area/' + action + '/' + (id || ''); }
        //#endregion
    });