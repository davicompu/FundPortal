define([],
    function () {

        var datamodel = {
            Item: Area,
        };

        return datamodel;

        function Area(data) {

            var self = this;
            data = data || {};

            //#region Persisted properties
            self.Id = data.Id;
            self.Number = data.Number;
            self.Name = data.Name;
            //#endregion

            //#region Non-persisted properties
            self.errorMessage = ko.observable();
            //#endregion

            //#region Public methods
            self.toJson = function () { return ko.toJSON(self); };
            //#endregion
        }
    });