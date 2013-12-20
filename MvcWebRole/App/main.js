requirejs.config({
    paths: {
        'text': '../Scripts/text',
        'durandal': '../Scripts/durandal',
        'plugins': '../Scripts/durandal/plugins',
        'transitions': '../Scripts/durandal/transitions'
    }
});

define('jquery', function () { return jQuery; });
define('knockout', ko);

define(['durandal/system', 'durandal/app', 'durandal/viewLocator', 'services/logger',
    'plugins/router'],
    function (system, app, viewLocator, logger, router) {
        //>>excludeStart("build", true);
        system.debug(true);
        //>>excludeEnd("build");

        app.title = 'Foundation Portal';

        app.configurePlugins({
            router: true,
            dialog: true,
            widget: true
        });

        app.start().then(function () {
            //Replace 'viewmodels' in the moduleId with 'views' to locate the view.
            //Look for partial views in a 'views' folder in the root.
            viewLocator.useConvention();

            //Show the app by setting the root view model for our application with a transition.
            app.setRoot('viewmodels/shell');

            // toastr.js pop-up configuration
            toastr.options.positionClass = 'toast-bottom-full-width';
            toastr.options.backgroundpositionClass = 'toast-bottom-full-width';

            // Indicate when there is no Internet connection
            window.addEventListener('offline', function () {
                if (!navigator.onLine) {
                    logger.logError("No Internet connection", null, 'main', true);
                }
            });

            // Configure ko.validation options.
            ko.validation.init({
                insertMessages: false
            });

            // TODO: Add "route not found" indicator.
        });
    });