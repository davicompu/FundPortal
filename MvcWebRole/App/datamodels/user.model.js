define([],
    function () {

        var dataModel = {
            Item: User,
        };

        return dataModel;

        function User(data) {
            // Avoid the constructor pointing to the global object when 'new' is omitted.
            if (!(this instanceof User)) {
                return new User(data);
            }

            var self = this;
            data = data || {};

            //#region Persisted properties.
            self.Id = data.Id;
            self.Pid = ko.observable(data.Pid).extend({ required: true });
            self.Roles = ko.observableArray(data.Roles || []);
            //#endregion

            //#region Non-persisted properties.
            self.errorMessage = ko.observable();
            //#endregion

            //#region Public methods.
            self.toJson = function () { return ko.toJSON(self); };
            //#endregion
        }
    });