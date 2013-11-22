define([], function () {

    var helper = {
        clearErrorMessage: clearErrorMessage,
        ajaxRequest: ajaxRequest,
        getModelStateErrors: getModelStateErrors,
    };

    return helper;

    function clearErrorMessage(entity) {
        entity.errorMessage(null);
    }

    function ajaxRequest(type, url, data, dataType) { // Ajax helper
        var options = {
            dataType: dataType || "json",
            contentType: "application/json",
            cache: false,
            type: type,
            data: data ? data.toJson() : null,
        };
        var antiForgeryToken = $("#antiForgeryToken").val();
        if (antiForgeryToken) {
            options.headers = {
                'RequestVerificationToken': antiForgeryToken
            };
        }
        return $.ajax(url, options);
    }

    function getModelStateErrors(errorData, errorText) {
        if (undefined !== errorData.ModelState) {
            $.each(errorData.ModelState, function (index, value) {
                $.each(value, function (index, modelError) {
                    errorText += ' ' + modelError;
                });
            });
        }
        return errorText;
    }
});