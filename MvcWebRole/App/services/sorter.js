define([],
    function () {

        var sorter = {
            sortByNumber: sortByNumber,
            sortByTitle: sortByTitle,
            sortByResponsiblePerson: sortByResponsiblePerson,
            sortByCurrentBudget: sortByCurrentBudget,
            sortByProjectedExpenditures: sortByProjectedExpenditures,
            sortByRequestedBudget: sortByRequestedBudget,
            sortByVariance: sortByVariance,
        };

        return sorter;

        function sortByNumber(observableArray) {
            observableArray.sort(function (left, right) {
                return left.Number() === right.Number() ? 0 :
                    (left.Number() < right.Number() ? -1 : 1);
            });
        }

        function sortByTitle(observableArray) {
            observableArray.sort(function (left, right) {
                return left.Title() === right.Title() ? 0 :
                    (left.Title() < right.Title() ? -1 : 1);
            });
        }

        function sortByResponsiblePerson(observableArray) {
            observableArray.sort(function (left, right) {
                return left.ResponsiblePerson() === right.ResponsiblePerson() ? 0 :
                    (left.ResponsiblePerson() < right.ResponsiblePerson() ? -1 : 1);
            });
        }

        function sortByCurrentBudget(observableArray) {
            observableArray.sort(function (left, right) {
                return left.CurrentBudget() === right.CurrentBudget() ? 0 :
                    (left.CurrentBudget() < right.CurrentBudget() ? -1 : 1);
            });
        }

        function sortByProjectedExpenditures(observableArray) {
            observableArray.sort(function (left, right) {
                return left.ProjectedExpenditures() === right.ProjectedExpenditures() ? 0 :
                    (left.ProjectedExpenditures() < right.ProjectedExpenditures() ? -1 : 1);
            });
        }

        function sortByRequestedBudget(observableArray) {
            observableArray.sort(function (left, right) {
                return left.requestedBudget() === right.requestedBudget() ? 0 :
                    (left.requestedBudget() < right.requestedBudget() ? -1 : 1);
            });
        }

        function sortByVariance(observableArray) {
            observableArray.sort(function (left, right) {
                return left.variance() === right.variance() ? 0 :
                    (left.variance() < right.variance() ? -1 : 1);
            });
        }
    });