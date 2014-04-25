define(['datamodels/comment.model', 'services/contexthelper'],
    function (model, contextHelper) {

        //#region Public API.
        var datacontext = {
            createItem: createItem,
            getItems: getItems,
            saveNewItem: saveNewItem,
        }
        //#endregion

        return datacontext;

        //#region Public methods.
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
                errorObservable('An error occurred during your request: ' +
                    result.statusText);
            }
        }

        function getItems(itemObservableArray, errorObservable, action, data) {
            return $.getJSON(itemApi(action), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                var mappedItems = $.map(result, function (item) {
                    return new createItem(item);
                });
                itemObservableArray(mappedItems);
            }

            function getFailed(result) {
                itemObservableArray(undefined);
                errorObservable('An error occurred during your request: ' +
                    result.statusText);
            }
        }

        function saveNewItem(data) {
            contextHelper.clearErrorMessage(data);
            return contextHelper.ajaxRequest('post', itemApi('post'), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                return result;
            }

            function getFailed(result) {
                var errorText = 'Error adding the new item: ' +
                    result.statusText + '.';
                data.errorMessage(contextHelper.getModelStateErrors(JSON.parse(result.responseText || '{}'), errorText));
            }
        }
        //#endregion

        //#region Private properties.
        // Routes.
        function itemApi(action, id) { return '/api/comment/' + action + '/' + (id || ''); }
        //#endregion
    });