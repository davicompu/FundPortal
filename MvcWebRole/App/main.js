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
    'plugins/router', 'global/session'],
    function (system, app, viewLocator, logger, router, session) {
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
            toastr.options.timeOut = 0;
            toastr.options.extendedTimeOut = 0;
            toastr.options.closeButton = true;

            // Indicate when there is no Internet connection
            window.addEventListener('offline', function () {
                if (!navigator.onLine) {
                    logger.logError("No Internet connection", null, 'main', true);
                }
            });

            configureKnockout();

            // TODO: Add "route not found" indicator.
        });

        function configureKnockout() {
            ko.validation.init({
                insertMessages: false
            });

            if (!ko.utils.cloneNodes) {
                ko.utils.cloneNodes = function (nodesArray, shouldCleanNodes) {
                    for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
                        var clonedNode = nodesArray[i].cloneNode(true);
                        newNodesArray.push(shouldCleanNodes ? ko.cleanNode(clonedNode) : clonedNode);
                    }
                    return newNodesArray;
                };
            }

            ko.bindingHandlers.ifIsInRole = {
                init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    ko.utils.domData.set(element, '__ko_withIfBindingData', {});
                    return { 'controlsDescendantBindings': true };
                },
                update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    var withIfData = ko.utils.domData.get(element, '__ko_withIfBindingData'),
                        dataValue = ko.utils.unwrapObservable(valueAccessor()),
                        shouldDisplay = session.userIsInRole(dataValue),
                        isFirstRender = !withIfData.savedNodes,
                        needsRefresh = isFirstRender || (shouldDisplay !== withIfData.didDisplayOnLastUpdate),
                        makeContextCallback = false;

                    if (needsRefresh) {
                        if (isFirstRender) {
                            withIfData.savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                        }

                        if (shouldDisplay) {
                            if (!isFirstRender) {
                                ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(withIfData.savedNodes));
                            }
                            ko.applyBindingsToDescendants(makeContextCallback ? makeContextCallback(bindingContext, dataValue) : bindingContext, element);
                        } else {
                            ko.virtualElements.emptyNode(element);
                        }

                        withIfData.didDisplayOnLastUpdate = shouldDisplay;
                    }
                }
            };

            ko.bindingHandlers.ifNotIsInRole = {
                init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    ko.utils.domData.set(element, '__ko_withIfBindingData', {});
                    return { 'controlsDescendantBindings': true };
                },
                update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    var withIfData = ko.utils.domData.get(element, '__ko_withIfBindingData'),
                        dataValue = ko.utils.unwrapObservable(valueAccessor()),
                        shouldDisplay = !session.userIsInRole(dataValue),
                        isFirstRender = !withIfData.savedNodes,
                        needsRefresh = isFirstRender || (shouldDisplay !== withIfData.didDisplayOnLastUpdate),
                        makeContextCallback = false;

                    if (needsRefresh) {
                        if (isFirstRender) {
                            withIfData.savedNodes = ko.utils.cloneNodes(ko.virtualElements.childNodes(element), true /* shouldCleanNodes */);
                        }

                        if (shouldDisplay) {
                            if (!isFirstRender) {
                                ko.virtualElements.setDomNodeChildren(element, ko.utils.cloneNodes(withIfData.savedNodes));
                            }
                            ko.applyBindingsToDescendants(makeContextCallback ? makeContextCallback(bindingContext, dataValue) : bindingContext, element);
                        } else {
                            ko.virtualElements.emptyNode(element);
                        }

                        withIfData.didDisplayOnLastUpdate = shouldDisplay;
                    }
                }
            };
        }
    });