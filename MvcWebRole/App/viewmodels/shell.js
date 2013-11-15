﻿define(['plugins/router', 'durandal/app'],
    function (router, app) {

        var shell = {
            activate: activate,
            router: router,
        };

        return shell;

        //#region Internal Methods
        function activate() {
            router.map([
                // Default route
                { route: '', moduleId: 'viewmodels/reports/funding-request' },


                { route: 'areas/browse', moduleId: 'viewmodels/areas/browse' },
                { route: 'areas/create', moduleId: 'viewmodels/areas/create' },
                { route: 'areas/edit/:id', moduleId: 'viewmodels/areas/edit' },

                { route: 'funds/browse', moduleId: 'viewmodels/funds/browse' },
                { route: 'funds/create', moduleId: 'viewmodels/funds/create' },
                { route: 'funds/edit/:id', moduleId: 'viewmodels/funds/edit' },

                { route: 'reports/funding-request', moduleId: 'viewmodels/reports/funding-request' }
            ]).buildNavigationModel();

            return router.activate();
        }
        //#endregion
    });
