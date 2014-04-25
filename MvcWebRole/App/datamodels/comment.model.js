define([],
    function () {

        var datamodel = {
            Item: Comment,
        };

        return datamodel;

        function Comment(data) {
            if (!(this instanceof Comment)) {
                return new Comment(data);
            }

            var self = this;
            data = data || {};

            //#region Persisted properties
            self.Id = data.Id;
            self.FundId = data.FundId;
            self.Text = ko.observable(data.Text);
            self.UserName = ko.observable(data.UserName);
            self.DateTimeCreated = data.DateTimeCreated || new Date();
            //#endregion

            //#region Non-persisted properties
            self.errorMessage = ko.observable();
            //#endregion

            //#region Public methods
            self.toJson = function () { return ko.toJSON(self); };
            //#endregion
        }
    });