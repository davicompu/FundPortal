define(['plugins/router', 'durandal/app'],
    function (router, app) {

        var shell = {
            activate: activate,
            attached: attached,
            router: router,
        };

        return shell;

        //#region Internal Methods
        function activate() {
            router.map([
                // Default route
                { route: '', moduleId: 'viewmodels/funds/browse' },


                { route: 'areas/browse', moduleId: 'viewmodels/areas/browse' },
                { route: 'areas/create', moduleId: 'viewmodels/areas/create' },
                { route: 'areas/edit/:id', moduleId: 'viewmodels/areas/edit' },

                { route: 'funds/browse', moduleId: 'viewmodels/funds/browse' },
                { route: 'funds/create', moduleId: 'viewmodels/funds/create' },
                { route: 'funds/edit/:id', moduleId: 'viewmodels/funds/edit' },

                { route: 'reports/funding-request', moduleId: 'viewmodels/reports/funding-request' },
                {
                    route: 'reports/narrative',
                    moduleId: 'viewmodels/reports/narrative'
                }
            ]).buildNavigationModel();

            return router.activate();
        }

        function attached() {
            // Initialize Foundation scripts
            $(document).foundation();

            // Create Counter object
            var countdown = new chrisjsherm.Counter({
                seconds: 1170,

                onUpdateStatus: function (second) {
                    // change the UI that displays the seconds remaining in the timeout.
                    if (parseInt(second) < 91) {
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
