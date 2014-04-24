define(['plugins/router', 'durandal/app', 'services/security', 'global/session',
    'services/logger'],
    function (router, app, security, session, logger) {

        var shell = {
            activate: activate,
            attached: attached,
            router: router,
        };

        return shell;

        //#region Internal Methods
        function setupRouter() {
            router.map([
                // Default route
                { route: ['', 'funds/browse'], moduleId: 'viewmodels/funds/browse' },

                { route: 'areas/browse', moduleId: 'viewmodels/areas/browse', requiredRoles: ['MANAGE-AREAS'] },
                { route: 'areas/create', moduleId: 'viewmodels/areas/create', requiredRoles: ['MANAGE-AREAS'] },
                { route: 'areas/edit/:id', moduleId: 'viewmodels/areas/edit', requiredRoles: ['MANAGE-AREAS'] },

                { route: 'funds/create', moduleId: 'viewmodels/funds/create' },
                { route: 'funds/edit/:id', moduleId: 'viewmodels/funds/edit' },
                { route: 'funds/manage', moduleId: 'viewmodels/funds/manage', requiredRoles: ['MANAGE-FUNDS'] },

                { route: 'reports/funding-request', moduleId: 'viewmodels/reports/funding-request' },
                {
                    route: 'reports/narrative',
                    moduleId: 'viewmodels/reports/narrative'
                },

                { route: 'users/browse', moduleId: 'viewmodels/users/browse', requiredRoles: ['MANAGE-USERS'] },
                { route: 'users/create', moduleId: 'viewmodels/users/create', requiredRoles: ['MANAGE-USERS'] },
                { route: 'users/edit/:id', moduleId: 'viewmodels/users/edit', requiredRoles: ['MANAGE-USERS'] }
            ]).buildNavigationModel();

            router.guardRoute = function (routeInfo, params, instance) {
                if (typeof (params.config.requiredRoles) !== "undefined") {
                    var res = session.userIsInRole(params.config.requiredRoles);

                    if (!res) {
                        logger.log("Access denied. Navigation canceled.",
                            null,
                            'viewmodels/shell',
                            true,
                            "warning"
                        );
                    }

                    return res;
                } else {
                    return true;
                }
            };

            return router.activate();
        }

        function init() {
            security.getUserInfo()
                .done(function (data) {
                    if (data.UserName) {
                        session.setUser(data);
                        setupRouter();
                    } else {
                        logger.log("Access denied. Navigation canceled.",
                            null,
                            'viewmodels/shell',
                            true,
                            "warning"
                        );

                        setupRouter();
                    }
                })
                .fail(function () {
                    logger.log("Access denied. Navigation canceled.",
                        null,
                        'viewmodels/shell',
                        true,
                        "warning"
                    );

                    setupRouter();
                });
        }

        function activate() {
            return init();
        }

        function attached() {
            // Initialize Foundation scripts
            $(document).foundation();

            // Create Counter object
            var countdown = new chrisjsherm.Counter({
                seconds: 1170,

                onUpdateStatus: function (second) {
                    // change the UI that displays the seconds remaining in the timeout.
                    if (parseInt(second, 10) < 91) {
                        $('#timeoutModal').foundation('reveal', 'open');
                        $('.counter').text(second);
                    }
                },

                onCounterEnd: function () {
                    // Replace the current URL with a random querystring to force reauthentication.
                    window.location.replace('/home/logout');
                },
            });

            // Start counter
            countdown.start();

            // Restart the counter after successful Ajax requests. Close the timeout modal if it's open.
            $(document).ajaxSuccess(function () {
                countdown.restart();
                $('#timeoutModal').foundation('reveal', 'close');
            });

            // Hit the dummy session extension Controller action when the user closes the modal.
            $('.close-reveal-modal').on('click', function () {
                $.get('api/session/extend');
            });

            // Hook up the 'Continue' button to the default close anchor.
            $('span.button-close-reveal-modal').on('click', function () {
                $('a.close-reveal-modal').trigger('click');
            });
        }
        //#endregion
    });
