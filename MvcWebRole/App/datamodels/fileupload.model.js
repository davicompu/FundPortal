define([],
    function () {

        var datamodel = {
            Item: FileUpload,
        };

        return datamodel;

        function FileUpload(data) {

            var self = this;
            data = data || {};

            //#region Persisted properties
            self.Id = data.Id;
            self.DateTimeCreated = data.DateTimeCreated || new Date();
            self.Source = data.Source;
            self.ContentType = data.ContentType;
            self.OriginalFileName = data.OriginalFileName;
            //#endregion

            //#region Non-persisted properties
            self.errorMessage = ko.observable(data.Message);
            self.destroy = ko.observable(false);
            //#endregion

            //#region Public methods
            self.toJson = function () { return ko.toJSON(self); };
            //#endregion
        }
    });