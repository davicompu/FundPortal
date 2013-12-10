define([],
    function () {

        var sorter = {
            sort: sort,
        };

        return sorter;

        function sort(observableArray, fieldName, sortAscending) {
            if (sortAscending) {
                observableArray.sort(function (left, right) {
                    return left[fieldName]() === right[fieldName]() ? 0 :
                        (left[fieldName]() < right[fieldName]() ? -1 : 1);
                });
            } else {
                observableArray.sort(function (left, right) {
                    return left[fieldName]() === right[fieldName]() ? 0 :
                        (left[fieldName]() > right[fieldName]() ? -1 : 1);
                });
            }
        }
    });