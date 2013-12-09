(function () {
/**
 * almond 0.2.6 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var main, req, makeMap, handlers,
        defined = {},
        waiting = {},
        config = {},
        defining = {},
        hasOwn = Object.prototype.hasOwnProperty,
        aps = [].slice;

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var nameParts, nameSegment, mapValue, foundMap,
            foundI, foundStarMap, starI, i, j, part,
            baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {};

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; i < name.length; i += 1) {
                    part = name[i];
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            break;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            } else if (name.indexOf('./') === 0) {
                // No baseName, so this is ID is resolved relative
                // to baseUrl, pull off the leading dot.
                name = name.substring(2);
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                foundI = i;
                                break;
                            }
                        }
                    }
                }

                if (foundMap) {
                    break;
                }

                //Check for a star map match, but just hold on to it,
                //if there is a shorter segment match later in a matching
                //config, then favor over this star map.
                if (!foundStarMap && starMap && starMap[nameSegment]) {
                    foundStarMap = starMap[nameSegment];
                    starI = i;
                }
            }

            if (!foundMap && foundStarMap) {
                foundMap = foundStarMap;
                foundI = starI;
            }

            if (foundMap) {
                nameParts.splice(0, foundI, foundMap);
                name = nameParts.join('/');
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (hasProp(waiting, name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!hasProp(defined, name) && !hasProp(defining, name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    //Turns a plugin!resource to [plugin, resource]
    //with the plugin being undefined if the name
    //did not have a plugin prefix.
    function splitPrefix(name) {
        var prefix,
            index = name ? name.indexOf('!') : -1;
        if (index > -1) {
            prefix = name.substring(0, index);
            name = name.substring(index + 1, name.length);
        }
        return [prefix, name];
    }

    function onResourceLoad(name, defined, deps){
        if(requirejs.onResourceLoad && name){
            requirejs.onResourceLoad({defined:defined}, {id:name}, deps);
        }
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    makeMap = function (name, relName) {
        var plugin,
            parts = splitPrefix(name),
            prefix = parts[0];

        name = parts[1];

        if (prefix) {
            prefix = normalize(prefix, relName);
            plugin = callDep(prefix);
        }

        //Normalize according
        if (prefix) {
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];
            if (prefix) {
                plugin = callDep(prefix);
            }
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            pr: prefix,
            p: plugin
        };
    };

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    handlers = {
        require: function (name) {
            return makeRequire(name);
        },
        exports: function (name) {
            var e = defined[name];
            if (typeof e !== 'undefined') {
                return e;
            } else {
                return (defined[name] = {});
            }
        },
        module: function (name) {
            return {
                id: name,
                uri: '',
                exports: defined[name],
                config: makeConfig(name)
            };
        }
    };

    main = function (name, deps, callback, relName) {
        var cjsModule, depName, ret, map, i,
            args = [],
            usingExports;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i += 1) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = handlers.require(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = handlers.exports(name);
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = handlers.module(name);
                } else if (hasProp(defined, depName) ||
                           hasProp(waiting, depName) ||
                           hasProp(defining, depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                        cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }

        onResourceLoad(name, defined, args);
    };

    requirejs = require = req = function (deps, callback, relName, forceSync, alt) {
        if (typeof deps === "string") {
            if (handlers[deps]) {
                //callback in this case is really relName
                return handlers[deps](callback);
            }
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //If relName is a function, it is an errback handler,
        //so remove it.
        if (typeof relName === 'function') {
            relName = forceSync;
            forceSync = alt;
        }

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            //Using a non-zero value because of concern for what old browsers
            //do, and latest browsers "upgrade" to 4 if lower value is used:
            //http://www.whatwg.org/specs/web-apps/current-work/multipage/timers.html#dom-windowtimers-settimeout:
            //If want a value immediately, use require('id') instead -- something
            //that works in almond on the global level, but not guaranteed and
            //unlikely to work in other AMD implementations.
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 4);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        if (config.deps) {
            req(config.deps, config.callback);
        }
        return req;
    };

    /**
     * Expose module registry for debugging and tooling
     */
    requirejs._defined = defined;

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        if (!hasProp(defined, name) && !hasProp(waiting, name)) {
            waiting[name] = [name, deps, callback];
        }
    };

    define.amd = {
        jQuery: true
    };
}());

define("../Scripts/almond-custom", function(){});

define('datamodels/area.model',[],
    function () {

        var datamodel = {
            Item: Area,
            ItemSubtotals: AreaSubtotals,
        };

        return datamodel;

        function Area(data) {

            var self = this;
            data = data || {};

            //#region Persisted properties
            self.Id = data.Id;
            self.Number = ko.observable(data.Number).extend({ required: true });
            self.Name = ko.observable(data.Name).extend({ required: true });
            //#endregion

            //#region Non-persisted properties
            self.errorMessage = ko.observable();
            self.funds = ko.observableArray([]);
            self.subtotals = ko.observable();
            //#endregion

            //#region Public methods
            self.toJson = function () { return ko.toJSON(self); };
            //#endregion
        }

        function AreaSubtotals(data) {
            var self = this;
            data = data || {};

            self.Id = data._id;
            self.currentBudget = ko.observable(data.currentBudget || 0);
            self.projectedExpenditures = ko.observable(data.projectedExpenditures || 0);
            self.budgetAdjustment = ko.observable(data.budgetAdjustment || 0);
            self.requestedBudget = ko.computed(function () {
                return self.currentBudget() + self.budgetAdjustment();
            });
            self.variance = ko.computed(function () {
                return self.currentBudget() - self.requestedBudget();
            });
            self.formattedCurrentBudget = ko.observable(data.currentBudget || 0)
                .extend({ currency: [0, self.currentBudget] });
            self.formattedProjectedExpenditures = ko.observable(data.projectedExpenditures || 0)
                .extend({ currency: [0, self.projectedExpenditures] });
            self.formattedRequestedBudget = ko.observable(self.requestedBudget())
                .extend({ currency: [0] });
            self.formattedVariance = ko.observable(self.variance())
                .extend({ currency: [0] });
            self.requestedBudget.subscribe(function (newValue) {
                self.formattedRequestedBudget(newValue);
            });
            self.variance.subscribe(function (newValue) {
                self.formattedVariance(newValue);
            });
        }
    });
define('services/contexthelper',[], function () {

    var helper = {
        clearErrorMessage: clearErrorMessage,
        ajaxRequest: ajaxRequest,
        getModelStateErrors: getModelStateErrors,
    };

    return helper;

    function clearErrorMessage(entity) {
        entity.errorMessage(null);
    }

    function ajaxRequest(type, url, data, dataType) { // Ajax helper
        var options = {
            dataType: dataType || "json",
            contentType: "application/json",
            cache: false,
            type: type,
            data: data ? data.toJson() : null,
        };
        var antiForgeryToken = $("#antiForgeryToken").val();
        if (antiForgeryToken) {
            options.headers = {
                'RequestVerificationToken': antiForgeryToken
            };
        }
        return $.ajax(url, options);
    }

    function getModelStateErrors(errorData, errorText) {
        if (undefined !== errorData.ModelState) {
            $.each(errorData.ModelState, function (index, value) {
                $.each(value, function (index, modelError) {
                    errorText += ' ' + modelError;
                });
            });
        }
        return errorText;
    }
});
define('datacontexts/area.datacontext',['datamodels/area.model', 'services/contexthelper'],
    function (model, contextHelper) {
        //#region Public api.
        var datacontext = {
            createItem: createItem,
            getItem: getItem,
            getItems: getItems,
            saveNewItem: saveNewItem,
            saveChangedItem: saveChangedItem,
            deleteItem: deleteItem,
            otherUsesOfFundsId: ko.observable(),
        };

        return datacontext;
        //#endregion

        //#region Publicly accessible methods.
        function createItem(data) {
            return new model.Item(data);
        }

        function getItem(id, itemObservable, errorObservable) {
            return contextHelper.ajaxRequest('get', itemApi('get', id))
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                itemObservable(new createItem(result));
            }

            function getFailed(result) {
                itemObservable(undefined);
                errorObservable('An error occurred during your request: ' +
                    result.statusText);
            }
        }

        function getItems(itemObservableArray, errorObservable, action, data, successFunctions) {
            return contextHelper.ajaxRequest('get', itemApi(action), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                var mappedItems = $.map(result, function (item) {
                    // Note 'Other uses of funds' Id
                    if (item.Number === 'O') {
                        datacontext.otherUsesOfFundsId(item.Id);
                    }
                    return new createItem(item);
                });
                itemObservableArray(mappedItems);

                $.each(successFunctions || [], function (index, value) {
                    value(mappedItems);
                });
            }

            function getFailed(result) {
                itemObservableArray(undefined);
                errorObservable('An error occurred during your request: ' +
                    result.statusText);
            }
        }

        function saveNewItem(data, successFunctions) {
            contextHelper.clearErrorMessage(data);
            return contextHelper.ajaxRequest('post', itemApi('post'), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                $.each(successFunctions || [], function (index, value) {
                    value(result);
                });
            }

            function getFailed(result) {
                var errorText = 'Error adding the new item: ' +
                    result.statusText + '.';
                data.errorMessage(contextHelper.getModelStateErrors(JSON.parse(result.responseText || '{}'), errorText));
            }
        }

        function saveChangedItem(data, successFunctions) {
            contextHelper.clearErrorMessage(data);
            return contextHelper.ajaxRequest('put', itemApi('put', data.Id), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                $.each(successFunctions || [], function (index, value) {
                    value(result);
                });
            }

            function getFailed(result) {
                var errorText = 'Error adding the new item: ' +
                    result.statusText + '.';
                data.errorMessage(contextHelper.getModelStateErrors(JSON.parse(result.responseText || '{}'), errorText));
            }
        }

        function deleteItem(data, successFunctions) {
            contextHelper.clearErrorMessage(data);
            return contextHelper.ajaxRequest('delete', itemApi('delete', data.Id))
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded() {
                $.each(successFunctions || [], function (index, value) {
                    value();
                });
            }

            function getFailed(result) {
                data.errorMessage('Error deleting the item: ' +
                    result.statusText);
            }
        }
        //#endregion

        //#region Private properties.
        // Routes.
        function itemApi(action, id) { return '/api/area/' + action + '/' + (id || ''); }
        //#endregion
    });
define('datamodels/fileupload.model',[],
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
define('datacontexts/fileupload.datacontext',['datamodels/fileupload.model', 'services/contexthelper'],
    function (model, contextHelper) {
        //#region Public api.
        var datacontext = {
            createItem: createItem,
            saveNewItem: saveNewItem,
            deleteItem: deleteItem,
        };

        return datacontext;
        //#endregion

        //#region Publicly accessible methods.
        function createItem(data) {
            return new model.Item(data);
        }

        function saveNewItem(data, evt, itemObservable, errorObservable) {
            contextHelper.clearErrorMessage(data);

            var files = evt.target.files;
            //var formData = new FormData();
            var url = itemApi('post');
            for (var i = 0, file; file = files[i]; ++i) {
                var formData = new FormData();
                formData.append(file.name, file);
                postFile(formData, url, itemObservable);
            }
        }

        function deleteItem(data, successFunctions) {
            contextHelper.clearErrorMessage(data);
            // Use query string due to period in the file name.
            return contextHelper.ajaxRequest('delete', '/api/fileupload/delete?id=' + data.Id)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded() {
                $.each(successFunctions || [], function (index, value) {
                    value();
                });
            }

            function getFailed(result) {
                data.errorMessage('Error deleting the item: ' +
                    result.statusText);
            }
        }
        //#endregion

        //#region Private properties.
        // Routes.
        function itemApi(action, id) { return '/api/fileupload/' + action + '/' + (id || ''); }

        function postFile(formData, url, itemObservable) {
            var xhr = new XMLHttpRequest();
            xhr.open('post', url, true);
            xhr.onload = function (e) {
                var result = JSON.parse(xhr.response);
                itemObservable.push(createItem(result));
            };
            xhr.send(formData);
        }
        //#endregion
    });
define('datamodels/fund.model',['datacontexts/fileupload.datacontext'],
    function (fileUploadDatacontext) {

        var datamodel = {
            Item: Fund,
        };

        return datamodel;

        function Fund(data) {

            var self = this;
            data = data || {};

            //#region Persisted properties.
            self.Id = data.Id;
            self.AreaId = data.AreaId;
            self.Number = ko.observable(data.Number).extend({ required: true });
            self.DateTimeCreated = data.DateTimeCreated || new Date();
            self.DateTimeEdited = data.DateTimeEdited || [];
            self.Title = ko.observable(data.Title).extend({ required: true });
            self.Status = data.Status;
            self.Description = ko.observable(data.Description).extend({ required: true });
            self.ResponsiblePerson = ko.observable(data.ResponsiblePerson).extend({ required: true });
            self.CurrentBudget = ko.observable(data.CurrentBudget || 0)
                .extend({ required: true, numeric: 0 });
            self.ProjectedExpenditures = ko.observable(data.ProjectedExpenditures || 0)
                .extend({ required: true, numeric: 0 });
            self.BudgetAdjustment = ko.observable(data.BudgetAdjustment || 0)
                .extend({ required: true, numeric: 0 });
            self.BudgetAdjustmentNote = ko.observable(data.BudgetAdjustmentNote)
                .extend({
                    required: {
                        onlyIf: function () {
                            return self.BudgetAdjustment() > 0;
                        },
                        message: 'This field is required when there is a budget adjustment.'
                    }
                });
            self.FiscalYear = data.FiscalYear;
            self.FileUploads = initFiles(self, data.FileUploads);
            //#endregion

            
            //#region Non-persisted properties.
            // TODO: Remove on save to reduce unneccesary over-posting.
            self.errorMessage = ko.observable();
            self.requestedBudget = ko.computed(function () {
                return self.CurrentBudget() + self.BudgetAdjustment();
            });
            self.projectedYearEndBalance = ko.computed(function () {
                return self.CurrentBudget() - self.ProjectedExpenditures();
            });
            self.variance = ko.computed(function () {
                return self.CurrentBudget() - self.requestedBudget();
            });
            self.fundStatusText = ko.computed(function () {
                switch (self.Status) {
                    case 1:
                        return 'Draft';
                    case 2:
                        return 'Final';
                    default:
                        return 'Status error';
                }
            });
            self.formattedCurrentBudget = ko.observable(data.CurrentBudget || 0)
                .extend({ currency: [0, self.CurrentBudget] });
            self.formattedProjectedExpenditures = ko.observable(data.ProjectedExpenditures || 0)
                .extend({ currency: [0, self.ProjectedExpenditures] });
            self.formattedBudgetAdjustment = ko.observable(data.BudgetAdjustment || 0)
                .extend({ currency: [0, self.BudgetAdjustment] });
            self.formattedRequestedBudget = ko.observable(self.requestedBudget())
                .extend({ currency: [0] });
            self.formattedProjectedYearEndBalance = ko.observable(self.projectedYearEndBalance())
                .extend({ currency: [0] });
            self.formattedVariance = ko.observable(self.variance())
                .extend({ currency: [0] });
            //#endregion

            //#region Non-persisted functions.
            self.requestedBudget.subscribe(function (newValue) {
                self.formattedRequestedBudget(newValue);
            });
            self.projectedYearEndBalance.subscribe(function (newValue) {
                self.formattedProjectedYearEndBalance(newValue);
            });
            self.variance.subscribe(function (newValue) {
                self.formattedVariance(newValue);
            });
            self.toJson = function () { return ko.toJSON(self); };
            //#endregion
        }

        function initFiles(fund, fileData) {
            var fileArray = ko.observableArray([]);

            if (fileData) {
                $.each(fileData, function (index, value) {
                    fileArray.push(fileUploadDatacontext.createItem(value));
                });
            }
            return fileArray;
        }
    });
define('datacontexts/fund.datacontext',['datamodels/fund.model', 'services/contexthelper', 'datamodels/area.model'],
    function (model, contextHelper, areaModel) {
        //#region Public api.
        var datacontext = {
            createItem: createItem,
            getItem: getItem,
            getItems: getItems,
            saveNewItem: saveNewItem,
            saveChangedItem: saveChangedItem,
            deleteItem: deleteItem,
            getFundSubtotalsForArea: getFundSubtotalsForArea,
        };

        return datacontext;
        //#endregion

        //#region Publicly accessible methods.
        function createItem(data) {
            return new model.Item(data);
        }

        function getItem(id, itemObservable, errorObservable) {
            return contextHelper.ajaxRequest('get', itemApi('get', id))
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                itemObservable(new createItem(result));
            }

            function getFailed(result) {
                itemObservable(undefined);
                errorObservable('An error occurred during your request: ' +
                    result.statusText);
            }
        }

        function getItems(itemObservableArray, errorObservable, action, data, successFunctions) {
            return $.getJSON(itemApi(action), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                var mappedItems = $.map(result, function (item) {
                    return new createItem(item);
                });
                itemObservableArray(mappedItems);

                $.each(successFunctions || [], function (index, value) {
                    value(mappedItems);
                });
            }

            function getFailed(result) {
                itemObservableArray(undefined);
                errorObservable('An error occurred during your request: ' +
                    result.statusText);
            }
        }

        function getFundSubtotalsForArea(itemObservable, errorObservable, action, data, successFunctions) {
            return $.getJSON(itemApi(action), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                var subtotalData = new areaModel.ItemSubtotals(JSON.parse(result)[0]);
                itemObservable(subtotalData);

                $.each(successFunctions || [], function (index, value) {
                    value(subtotalData);
                });
            }

            function getFailed(result) {
                //itemObservableArray(undefined);
                errorObservable('An error occurred during your request: ' +
                    result.statusText);
            }
        }

        function saveNewItem(data, successFunctions) {
            contextHelper.clearErrorMessage(data);
            return contextHelper.ajaxRequest('post', itemApi('post'), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                $.each(successFunctions || [], function (index, value) {
                    value(result);
                });
            }

            function getFailed(result) {
                var errorText = 'Error adding the new item: ' +
                    result.statusText + '.';
                data.errorMessage(contextHelper.getModelStateErrors(JSON.parse(result.responseText || '{}'), errorText));
            }
        }

        function saveChangedItem(data, successFunctions) {
            contextHelper.clearErrorMessage(data);
            return contextHelper.ajaxRequest('put', itemApi('put', data.Id), data)
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded(result) {
                $.each(successFunctions || [], function (index, value) {
                    value(result);
                });
            }

            function getFailed(result) {
                var errorText = 'Error adding the new item: ' +
                    result.statusText + '.';
                data.errorMessage(contextHelper.getModelStateErrors(JSON.parse(result.responseText || '{}'), errorText));
            }
        }

        function deleteItem(data, itemObservableArray, successFunctions) {
            contextHelper.clearErrorMessage(data);
            return contextHelper.ajaxRequest('delete', itemApi('delete', data.Id))
                .done(getSucceeded)
                .fail(getFailed);

            function getSucceeded() {
                $.each(successFunctions || [], function (index, value) {
                    value();
                });
            }

            function getFailed(result) {
                data.errorMessage('Error deleting the item: ' +
                    result.statusText);
            }
        }
        //#endregion

        //#region Private properties.
        // Routes.
        function itemApi(action, id) { return '/api/fund/' + action + '/' + (id || ''); }
        //#endregion
    });
/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The system module encapsulates the most basic features used by other modules.
 * @module system
 * @requires require
 * @requires jquery
 */
define('durandal/system',['require', 'jquery'], function(require, $) {
    var isDebugging = false,
        nativeKeys = Object.keys,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        toString = Object.prototype.toString,
        system,
        treatAsIE8 = false,
        nativeIsArray = Array.isArray,
        slice = Array.prototype.slice;

    //see http://patik.com/blog/complete-cross-browser-console-log/
    // Tell IE9 to use its built-in console
    if (Function.prototype.bind && (typeof console === 'object' || typeof console === 'function') && typeof console.log == 'object') {
        try {
            ['log', 'info', 'warn', 'error', 'assert', 'dir', 'clear', 'profile', 'profileEnd']
                .forEach(function(method) {
                    console[method] = this.call(console[method], console);
                }, Function.prototype.bind);
        } catch (ex) {
            treatAsIE8 = true;
        }
    }

    // callback for dojo's loader 
    // note: if you wish to use Durandal with dojo's AMD loader,
    // currently you must fork the dojo source with the following
    // dojo/dojo.js, line 1187, the last line of the finishExec() function: 
    //  (add) signal("moduleLoaded", [module.result, module.mid]);
    // an enhancement request has been submitted to dojo to make this
    // a permanent change. To view the status of this request, visit:
    // http://bugs.dojotoolkit.org/ticket/16727

    if (require.on) {
        require.on("moduleLoaded", function(module, mid) {
            system.setModuleId(module, mid);
        });
    }

    // callback for require.js loader
    if (typeof requirejs !== 'undefined') {
        requirejs.onResourceLoad = function(context, map, depArray) {
            system.setModuleId(context.defined[map.id], map.id);
        };
    }

    var noop = function() { };

    var log = function() {
        try {
            // Modern browsers
            if (typeof console != 'undefined' && typeof console.log == 'function') {
                // Opera 11
                if (window.opera) {
                    var i = 0;
                    while (i < arguments.length) {
                        console.log('Item ' + (i + 1) + ': ' + arguments[i]);
                        i++;
                    }
                }
                // All other modern browsers
                else if ((slice.call(arguments)).length == 1 && typeof slice.call(arguments)[0] == 'string') {
                    console.log((slice.call(arguments)).toString());
                } else {
                    console.log.apply(console, slice.call(arguments));
                }
            }
            // IE8
            else if ((!Function.prototype.bind || treatAsIE8) && typeof console != 'undefined' && typeof console.log == 'object') {
                Function.prototype.call.call(console.log, console, slice.call(arguments));
            }

            // IE7 and lower, and other old browsers
        } catch (ignore) { }
    };

    var logError = function(error) {
        if(error instanceof Error){
            throw error;
        }

        throw new Error(error);
    };

    /**
     * @class SystemModule
     * @static
     */
    system = {
        /**
         * Durandal's version.
         * @property {string} version
         */
        version: "2.0.1",
        /**
         * A noop function.
         * @method noop
         */
        noop: noop,
        /**
         * Gets the module id for the specified object.
         * @method getModuleId
         * @param {object} obj The object whose module id you wish to determine.
         * @return {string} The module id.
         */
        getModuleId: function(obj) {
            if (!obj) {
                return null;
            }

            if (typeof obj == 'function') {
                return obj.prototype.__moduleId__;
            }

            if (typeof obj == 'string') {
                return null;
            }

            return obj.__moduleId__;
        },
        /**
         * Sets the module id for the specified object.
         * @method setModuleId
         * @param {object} obj The object whose module id you wish to set.
         * @param {string} id The id to set for the specified object.
         */
        setModuleId: function(obj, id) {
            if (!obj) {
                return;
            }

            if (typeof obj == 'function') {
                obj.prototype.__moduleId__ = id;
                return;
            }

            if (typeof obj == 'string') {
                return;
            }

            obj.__moduleId__ = id;
        },
        /**
         * Resolves the default object instance for a module. If the module is an object, the module is returned. If the module is a function, that function is called with `new` and it's result is returned.
         * @method resolveObject
         * @param {object} module The module to use to get/create the default object for.
         * @return {object} The default object for the module.
         */
        resolveObject: function(module) {
            if (system.isFunction(module)) {
                return new module();
            } else {
                return module;
            }
        },
        /**
         * Gets/Sets whether or not Durandal is in debug mode.
         * @method debug
         * @param {boolean} [enable] Turns on/off debugging.
         * @return {boolean} Whether or not Durandal is current debugging.
         */
        debug: function(enable) {
            if (arguments.length == 1) {
                isDebugging = enable;
                if (isDebugging) {
                    this.log = log;
                    this.error = logError;
                    this.log('Debug:Enabled');
                } else {
                    this.log('Debug:Disabled');
                    this.log = noop;
                    this.error = noop;
                }
            }

            return isDebugging;
        },
        /**
         * Logs data to the console. Pass any number of parameters to be logged. Log output is not processed if the framework is not running in debug mode.
         * @method log
         * @param {object} info* The objects to log.
         */
        log: noop,
        /**
         * Logs an error.
         * @method error
         * @param {string|Error} obj The error to report.
         */
        error: noop,
        /**
         * Asserts a condition by throwing an error if the condition fails.
         * @method assert
         * @param {boolean} condition The condition to check.
         * @param {string} message The message to report in the error if the condition check fails.
         */
        assert: function (condition, message) {
            if (!condition) {
                system.error(new Error(message || 'Assert:Failed'));
            }
        },
        /**
         * Creates a deferred object which can be used to create a promise. Optionally pass a function action to perform which will be passed an object used in resolving the promise.
         * @method defer
         * @param {function} [action] The action to defer. You will be passed the deferred object as a paramter.
         * @return {Deferred} The deferred object.
         */
        defer: function(action) {
            return $.Deferred(action);
        },
        /**
         * Creates a simple V4 UUID. This should not be used as a PK in your database. It can be used to generate internal, unique ids. For a more robust solution see [node-uuid](https://github.com/broofa/node-uuid).
         * @method guid
         * @return {string} The guid.
         */
        guid: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        /**
         * Uses require.js to obtain a module. This function returns a promise which resolves with the module instance. You can pass more than one module id to this function or an array of ids. If more than one or an array is passed, then the promise will resolve with an array of module instances.
         * @method acquire
         * @param {string|string[]} moduleId The id(s) of the modules to load.
         * @return {Promise} A promise for the loaded module(s).
         */
        acquire: function() {
            var modules,
                first = arguments[0],
                arrayRequest = false;

            if(system.isArray(first)){
                modules = first;
                arrayRequest = true;
            }else{
                modules = slice.call(arguments, 0);
            }

            return this.defer(function(dfd) {
                require(modules, function() {
                    var args = arguments;
                    setTimeout(function() {
                        if(args.length > 1 || arrayRequest){
                            dfd.resolve(slice.call(args, 0));
                        }else{
                            dfd.resolve(args[0]);
                        }
                    }, 1);
                }, function(err){
                    dfd.reject(err);
                });
            }).promise();
        },
        /**
         * Extends the first object with the properties of the following objects.
         * @method extend
         * @param {object} obj The target object to extend.
         * @param {object} extension* Uses to extend the target object.
         */
        extend: function(obj) {
            var rest = slice.call(arguments, 1);

            for (var i = 0; i < rest.length; i++) {
                var source = rest[i];

                if (source) {
                    for (var prop in source) {
                        obj[prop] = source[prop];
                    }
                }
            }

            return obj;
        },
        /**
         * Uses a setTimeout to wait the specified milliseconds.
         * @method wait
         * @param {number} milliseconds The number of milliseconds to wait.
         * @return {Promise}
         */
        wait: function(milliseconds) {
            return system.defer(function(dfd) {
                setTimeout(dfd.resolve, milliseconds);
            }).promise();
        }
    };

    /**
     * Gets all the owned keys of the specified object.
     * @method keys
     * @param {object} object The object whose owned keys should be returned.
     * @return {string[]} The keys.
     */
    system.keys = nativeKeys || function(obj) {
        if (obj !== Object(obj)) {
            throw new TypeError('Invalid object');
        }

        var keys = [];

        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                keys[keys.length] = key;
            }
        }

        return keys;
    };

    /**
     * Determines if the specified object is an html element.
     * @method isElement
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isElement = function(obj) {
        return !!(obj && obj.nodeType === 1);
    };

    /**
     * Determines if the specified object is an array.
     * @method isArray
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isArray = nativeIsArray || function(obj) {
        return toString.call(obj) == '[object Array]';
    };

    /**
     * Determines if the specified object is...an object. ie. Not an array, string, etc.
     * @method isObject
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isObject = function(obj) {
        return obj === Object(obj);
    };

    /**
     * Determines if the specified object is a boolean.
     * @method isBoolean
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isBoolean = function(obj) {
        return typeof(obj) === "boolean";
    };

    /**
     * Determines if the specified object is a promise.
     * @method isPromise
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isPromise = function(obj) {
        return obj && system.isFunction(obj.then);
    };

    /**
     * Determines if the specified object is a function arguments object.
     * @method isArguments
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a function.
     * @method isFunction
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a string.
     * @method isString
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a number.
     * @method isNumber
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a date.
     * @method isDate
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a boolean.
     * @method isBoolean
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    //isArguments, isFunction, isString, isNumber, isDate, isRegExp.
    var isChecks = ['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'];

    function makeIsFunction(name) {
        var value = '[object ' + name + ']';
        system['is' + name] = function(obj) {
            return toString.call(obj) == value;
        };
    }

    for (var i = 0; i < isChecks.length; i++) {
        makeIsFunction(isChecks[i]);
    }

    return system;
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The viewEngine module provides information to the viewLocator module which is used to locate the view's source file. The viewEngine also transforms a view id into a view instance.
 * @module viewEngine
 * @requires system
 * @requires jquery
 */
define('durandal/viewEngine',['durandal/system', 'jquery'], function (system, $) {
    var parseMarkup;

    if ($.parseHTML) {
        parseMarkup = function (html) {
            return $.parseHTML(html);
        };
    } else {
        parseMarkup = function (html) {
            return $(html).get();
        };
    }

    /**
     * @class ViewEngineModule
     * @static
     */
    return {
        /**
         * The file extension that view source files are expected to have.
         * @property {string} viewExtension
         * @default .html
         */
        viewExtension: '.html',
        /**
         * The name of the RequireJS loader plugin used by the viewLocator to obtain the view source. (Use requirejs to map the plugin's full path).
         * @property {string} viewPlugin
         * @default text
         */
        viewPlugin: 'text',
        /**
         * Determines if the url is a url for a view, according to the view engine.
         * @method isViewUrl
         * @param {string} url The potential view url.
         * @return {boolean} True if the url is a view url, false otherwise.
         */
        isViewUrl: function (url) {
            return url.indexOf(this.viewExtension, url.length - this.viewExtension.length) !== -1;
        },
        /**
         * Converts a view url into a view id.
         * @method convertViewUrlToViewId
         * @param {string} url The url to convert.
         * @return {string} The view id.
         */
        convertViewUrlToViewId: function (url) {
            return url.substring(0, url.length - this.viewExtension.length);
        },
        /**
         * Converts a view id into a full RequireJS path.
         * @method convertViewIdToRequirePath
         * @param {string} viewId The view id to convert.
         * @return {string} The require path.
         */
        convertViewIdToRequirePath: function (viewId) {
            return this.viewPlugin + '!' + viewId + this.viewExtension;
        },
        /**
         * Parses the view engine recognized markup and returns DOM elements.
         * @method parseMarkup
         * @param {string} markup The markup to parse.
         * @return {DOMElement[]} The elements.
         */
        parseMarkup: parseMarkup,
        /**
         * Calls `parseMarkup` and then pipes the results through `ensureSingleElement`.
         * @method processMarkup
         * @param {string} markup The markup to process.
         * @return {DOMElement} The view.
         */
        processMarkup: function (markup) {
            var allElements = this.parseMarkup(markup);
            return this.ensureSingleElement(allElements);
        },
        /**
         * Converts an array of elements into a single element. White space and comments are removed. If a single element does not remain, then the elements are wrapped.
         * @method ensureSingleElement
         * @param {DOMElement[]} allElements The elements.
         * @return {DOMElement} A single element.
         */
        ensureSingleElement:function(allElements){
            if (allElements.length == 1) {
                return allElements[0];
            }

            var withoutCommentsOrEmptyText = [];

            for (var i = 0; i < allElements.length; i++) {
                var current = allElements[i];
                if (current.nodeType != 8) {
                    if (current.nodeType == 3) {
                        var result = /\S/.test(current.nodeValue);
                        if (!result) {
                            continue;
                        }
                    }

                    withoutCommentsOrEmptyText.push(current);
                }
            }

            if (withoutCommentsOrEmptyText.length > 1) {
                return $(withoutCommentsOrEmptyText).wrapAll('<div class="durandal-wrapper"></div>').parent().get(0);
            }

            return withoutCommentsOrEmptyText[0];
        },
        /**
         * Creates the view associated with the view id.
         * @method createView
         * @param {string} viewId The view id whose view should be created.
         * @return {Promise} A promise of the view.
         */
        createView: function(viewId) {
            var that = this;
            var requirePath = this.convertViewIdToRequirePath(viewId);

            return system.defer(function(dfd) {
                system.acquire(requirePath).then(function(markup) {
                    var element = that.processMarkup(markup);
                    element.setAttribute('data-view', viewId);
                    dfd.resolve(element);
                }).fail(function(err){
                        that.createFallbackView(viewId, requirePath, err).then(function(element){
                            element.setAttribute('data-view', viewId);
                            dfd.resolve(element);
                        });
                    });
            }).promise();
        },
        /**
         * Called when a view cannot be found to provide the opportunity to locate or generate a fallback view. Mainly used to ease development.
         * @method createFallbackView
         * @param {string} viewId The view id whose view should be created.
         * @param {string} requirePath The require path that was attempted.
         * @param {Error} requirePath The error that was returned from the attempt to locate the default view.
         * @return {Promise} A promise for the fallback view.
         */
        createFallbackView: function (viewId, requirePath, err) {
            var that = this,
                message = 'View Not Found. Searched for "' + viewId + '" via path "' + requirePath + '".';

            return system.defer(function(dfd) {
                dfd.resolve(that.processMarkup('<div class="durandal-view-404">' + message + '</div>'));
            }).promise();
        }
    };
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The viewLocator module collaborates with the viewEngine module to provide views (literally dom sub-trees) to other parts of the framework as needed. The primary consumer of the viewLocator is the composition module.
 * @module viewLocator
 * @requires system
 * @requires viewEngine
 */
define('durandal/viewLocator',['durandal/system', 'durandal/viewEngine'], function (system, viewEngine) {
    function findInElements(nodes, url) {
        for (var i = 0; i < nodes.length; i++) {
            var current = nodes[i];
            var existingUrl = current.getAttribute('data-view');
            if (existingUrl == url) {
                return current;
            }
        }
    }
    
    function escape(str) {
        return (str + '').replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g, "\\$1");
    }

    /**
     * @class ViewLocatorModule
     * @static
     */
    return {
        /**
         * Allows you to set up a convention for mapping module folders to view folders. It is a convenience method that customizes `convertModuleIdToViewId` and `translateViewIdToArea` under the covers.
         * @method useConvention
         * @param {string} [modulesPath] A string to match in the path and replace with the viewsPath. If not specified, the match is 'viewmodels'.
         * @param {string} [viewsPath] The replacement for the modulesPath. If not specified, the replacement is 'views'.
         * @param {string} [areasPath] Partial views are mapped to the "views" folder if not specified. Use this parameter to change their location.
         */
        useConvention: function(modulesPath, viewsPath, areasPath) {
            modulesPath = modulesPath || 'viewmodels';
            viewsPath = viewsPath || 'views';
            areasPath = areasPath || viewsPath;

            var reg = new RegExp(escape(modulesPath), 'gi');

            this.convertModuleIdToViewId = function (moduleId) {
                return moduleId.replace(reg, viewsPath);
            };

            this.translateViewIdToArea = function (viewId, area) {
                if (!area || area == 'partial') {
                    return areasPath + '/' + viewId;
                }
                
                return areasPath + '/' + area + '/' + viewId;
            };
        },
        /**
         * Maps an object instance to a view instance.
         * @method locateViewForObject
         * @param {object} obj The object to locate the view for.
         * @param {string} [area] The area to translate the view to.
         * @param {DOMElement[]} [elementsToSearch] An existing set of elements to search first.
         * @return {Promise} A promise of the view.
         */
        locateViewForObject: function(obj, area, elementsToSearch) {
            var view;

            if (obj.getView) {
                view = obj.getView();
                if (view) {
                    return this.locateView(view, area, elementsToSearch);
                }
            }

            if (obj.viewUrl) {
                return this.locateView(obj.viewUrl, area, elementsToSearch);
            }

            var id = system.getModuleId(obj);
            if (id) {
                return this.locateView(this.convertModuleIdToViewId(id), area, elementsToSearch);
            }

            return this.locateView(this.determineFallbackViewId(obj), area, elementsToSearch);
        },
        /**
         * Converts a module id into a view id. By default the ids are the same.
         * @method convertModuleIdToViewId
         * @param {string} moduleId The module id.
         * @return {string} The view id.
         */
        convertModuleIdToViewId: function(moduleId) {
            return moduleId;
        },
        /**
         * If no view id can be determined, this function is called to genreate one. By default it attempts to determine the object's type and use that.
         * @method determineFallbackViewId
         * @param {object} obj The object to determine the fallback id for.
         * @return {string} The view id.
         */
        determineFallbackViewId: function (obj) {
            var funcNameRegex = /function (.{1,})\(/;
            var results = (funcNameRegex).exec((obj).constructor.toString());
            var typeName = (results && results.length > 1) ? results[1] : "";

            return 'views/' + typeName;
        },
        /**
         * Takes a view id and translates it into a particular area. By default, no translation occurs.
         * @method translateViewIdToArea
         * @param {string} viewId The view id.
         * @param {string} area The area to translate the view to.
         * @return {string} The translated view id.
         */
        translateViewIdToArea: function (viewId, area) {
            return viewId;
        },
        /**
         * Locates the specified view.
         * @method locateView
         * @param {string|DOMElement} viewOrUrlOrId A view, view url or view id to locate.
         * @param {string} [area] The area to translate the view to.
         * @param {DOMElement[]} [elementsToSearch] An existing set of elements to search first.
         * @return {Promise} A promise of the view.
         */
        locateView: function(viewOrUrlOrId, area, elementsToSearch) {
            if (typeof viewOrUrlOrId === 'string') {
                var viewId;

                if (viewEngine.isViewUrl(viewOrUrlOrId)) {
                    viewId = viewEngine.convertViewUrlToViewId(viewOrUrlOrId);
                } else {
                    viewId = viewOrUrlOrId;
                }

                if (area) {
                    viewId = this.translateViewIdToArea(viewId, area);
                }

                if (elementsToSearch) {
                    var existing = findInElements(elementsToSearch, viewId);
                    if (existing) {
                        return system.defer(function(dfd) {
                            dfd.resolve(existing);
                        }).promise();
                    }
                }

                return viewEngine.createView(viewId);
            }

            return system.defer(function(dfd) {
                dfd.resolve(viewOrUrlOrId);
            }).promise();
        }
    };
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The binder joins an object instance and a DOM element tree by applying databinding and/or invoking binding lifecycle callbacks (binding and bindingComplete).
 * @module binder
 * @requires system
 * @requires knockout
 */
define('durandal/binder',['durandal/system', 'knockout'], function (system, ko) {
    var binder,
        insufficientInfoMessage = 'Insufficient Information to Bind',
        unexpectedViewMessage = 'Unexpected View Type',
        bindingInstructionKey = 'durandal-binding-instruction',
        koBindingContextKey = '__ko_bindingContext__';

    function normalizeBindingInstruction(result){
        if(result === undefined){
            return { applyBindings: true };
        }

        if(system.isBoolean(result)){
            return { applyBindings:result };
        }

        if(result.applyBindings === undefined){
            result.applyBindings = true;
        }

        return result;
    }

    function doBind(obj, view, bindingTarget, data){
        if (!view || !bindingTarget) {
            if (binder.throwOnErrors) {
                system.error(insufficientInfoMessage);
            } else {
                system.log(insufficientInfoMessage, view, data);
            }
            return;
        }

        if (!view.getAttribute) {
            if (binder.throwOnErrors) {
                system.error(unexpectedViewMessage);
            } else {
                system.log(unexpectedViewMessage, view, data);
            }
            return;
        }

        var viewName = view.getAttribute('data-view');

        try {
            var instruction;

            if (obj && obj.binding) {
                instruction = obj.binding(view);
            }

            instruction = normalizeBindingInstruction(instruction);
            binder.binding(data, view, instruction);

            if(instruction.applyBindings){
                system.log('Binding', viewName, data);
                ko.applyBindings(bindingTarget, view);
            }else if(obj){
                ko.utils.domData.set(view, koBindingContextKey, { $data:obj });
            }

            binder.bindingComplete(data, view, instruction);

            if (obj && obj.bindingComplete) {
                obj.bindingComplete(view);
            }

            ko.utils.domData.set(view, bindingInstructionKey, instruction);
            return instruction;
        } catch (e) {
            e.message = e.message + ';\nView: ' + viewName + ";\nModuleId: " + system.getModuleId(data);
            if (binder.throwOnErrors) {
                system.error(e);
            } else {
                system.log(e.message);
            }
        }
    }

    /**
     * @class BinderModule
     * @static
     */
    return binder = {
        /**
         * Called before every binding operation. Does nothing by default.
         * @method binding
         * @param {object} data The data that is about to be bound.
         * @param {DOMElement} view The view that is about to be bound.
         * @param {object} instruction The object that carries the binding instructions.
         */
        binding: system.noop,
        /**
         * Called after every binding operation. Does nothing by default.
         * @method bindingComplete
         * @param {object} data The data that has just been bound.
         * @param {DOMElement} view The view that has just been bound.
         * @param {object} instruction The object that carries the binding instructions.
         */
        bindingComplete: system.noop,
        /**
         * Indicates whether or not the binding system should throw errors or not.
         * @property {boolean} throwOnErrors
         * @default false The binding system will not throw errors by default. Instead it will log them.
         */
        throwOnErrors: false,
        /**
         * Gets the binding instruction that was associated with a view when it was bound.
         * @method getBindingInstruction
         * @param {DOMElement} view The view that was previously bound.
         * @return {object} The object that carries the binding instructions.
         */
        getBindingInstruction:function(view){
            return ko.utils.domData.get(view, bindingInstructionKey);
        },
        /**
         * Binds the view, preserving the existing binding context. Optionally, a new context can be created, parented to the previous context.
         * @method bindContext
         * @param {KnockoutBindingContext} bindingContext The current binding context.
         * @param {DOMElement} view The view to bind.
         * @param {object} [obj] The data to bind to, causing the creation of a child binding context if present.
         */
        bindContext: function(bindingContext, view, obj) {
            if (obj && bindingContext) {
                bindingContext = bindingContext.createChildContext(obj);
            }

            return doBind(obj, view, bindingContext, obj || (bindingContext ? bindingContext.$data : null));
        },
        /**
         * Binds the view, preserving the existing binding context. Optionally, a new context can be created, parented to the previous context.
         * @method bind
         * @param {object} obj The data to bind to.
         * @param {DOMElement} view The view to bind.
         */
        bind: function(obj, view) {
            return doBind(obj, view, obj, obj);
        }
    };
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The activator module encapsulates all logic related to screen/component activation.
 * An activator is essentially an asynchronous state machine that understands a particular state transition protocol.
 * The protocol ensures that the following series of events always occur: `canDeactivate` (previous state), `canActivate` (new state), `deactivate` (previous state), `activate` (new state).
 * Each of the _can_ callbacks may return a boolean, affirmative value or promise for one of those. If either of the _can_ functions yields a false result, then activation halts.
 * @module activator
 * @requires system
 * @requires knockout
 */
define('durandal/activator',['durandal/system', 'knockout'], function (system, ko) {
    var activator;

    function ensureSettings(settings) {
        if (settings == undefined) {
            settings = {};
        }

        if (!settings.closeOnDeactivate) {
            settings.closeOnDeactivate = activator.defaults.closeOnDeactivate;
        }

        if (!settings.beforeActivate) {
            settings.beforeActivate = activator.defaults.beforeActivate;
        }

        if (!settings.afterDeactivate) {
            settings.afterDeactivate = activator.defaults.afterDeactivate;
        }

        if(!settings.affirmations){
            settings.affirmations = activator.defaults.affirmations;
        }

        if (!settings.interpretResponse) {
            settings.interpretResponse = activator.defaults.interpretResponse;
        }

        if (!settings.areSameItem) {
            settings.areSameItem = activator.defaults.areSameItem;
        }

        return settings;
    }

    function invoke(target, method, data) {
        if (system.isArray(data)) {
            return target[method].apply(target, data);
        }

        return target[method](data);
    }

    function deactivate(item, close, settings, dfd, setter) {
        if (item && item.deactivate) {
            system.log('Deactivating', item);

            var result;
            try {
                result = item.deactivate(close);
            } catch(error) {
                system.error(error);
                dfd.resolve(false);
                return;
            }

            if (result && result.then) {
                result.then(function() {
                    settings.afterDeactivate(item, close, setter);
                    dfd.resolve(true);
                }, function(reason) {
                    system.log(reason);
                    dfd.resolve(false);
                });
            } else {
                settings.afterDeactivate(item, close, setter);
                dfd.resolve(true);
            }
        } else {
            if (item) {
                settings.afterDeactivate(item, close, setter);
            }

            dfd.resolve(true);
        }
    }

    function activate(newItem, activeItem, callback, activationData) {
        if (newItem) {
            if (newItem.activate) {
                system.log('Activating', newItem);

                var result;
                try {
                    result = invoke(newItem, 'activate', activationData);
                } catch (error) {
                    system.error(error);
                    callback(false);
                    return;
                }

                if (result && result.then) {
                    result.then(function() {
                        activeItem(newItem);
                        callback(true);
                    }, function(reason) {
                        system.log(reason);
                        callback(false);
                    });
                } else {
                    activeItem(newItem);
                    callback(true);
                }
            } else {
                activeItem(newItem);
                callback(true);
            }
        } else {
            callback(true);
        }
    }

    function canDeactivateItem(item, close, settings) {
        settings.lifecycleData = null;

        return system.defer(function (dfd) {
            if (item && item.canDeactivate) {
                var resultOrPromise;
                try {
                    resultOrPromise = item.canDeactivate(close);
                } catch(error) {
                    system.error(error);
                    dfd.resolve(false);
                    return;
                }

                if (resultOrPromise.then) {
                    resultOrPromise.then(function(result) {
                        settings.lifecycleData = result;
                        dfd.resolve(settings.interpretResponse(result));
                    }, function(reason) {
                        system.error(reason);
                        dfd.resolve(false);
                    });
                } else {
                    settings.lifecycleData = resultOrPromise;
                    dfd.resolve(settings.interpretResponse(resultOrPromise));
                }
            } else {
                dfd.resolve(true);
            }
        }).promise();
    };

    function canActivateItem(newItem, activeItem, settings, activationData) {
        settings.lifecycleData = null;

        return system.defer(function (dfd) {
            if (newItem == activeItem()) {
                dfd.resolve(true);
                return;
            }

            if (newItem && newItem.canActivate) {
                var resultOrPromise;
                try {
                    resultOrPromise = invoke(newItem, 'canActivate', activationData);
                } catch (error) {
                    system.error(error);
                    dfd.resolve(false);
                    return;
                }

                if (resultOrPromise.then) {
                    resultOrPromise.then(function(result) {
                        settings.lifecycleData = result;
                        dfd.resolve(settings.interpretResponse(result));
                    }, function(reason) {
                        system.error(reason);
                        dfd.resolve(false);
                    });
                } else {
                    settings.lifecycleData = resultOrPromise;
                    dfd.resolve(settings.interpretResponse(resultOrPromise));
                }
            } else {
                dfd.resolve(true);
            }
        }).promise();
    };

    /**
     * An activator is a read/write computed observable that enforces the activation lifecycle whenever changing values.
     * @class Activator
     */
    function createActivator(initialActiveItem, settings) {
        var activeItem = ko.observable(null);
        var activeData;

        settings = ensureSettings(settings);

        var computed = ko.computed({
            read: function () {
                return activeItem();
            },
            write: function (newValue) {
                computed.viaSetter = true;
                computed.activateItem(newValue);
            }
        });

        computed.__activator__ = true;

        /**
         * The settings for this activator.
         * @property {ActivatorSettings} settings
         */
        computed.settings = settings;
        settings.activator = computed;

        /**
         * An observable which indicates whether or not the activator is currently in the process of activating an instance.
         * @method isActivating
         * @return {boolean}
         */
        computed.isActivating = ko.observable(false);

        /**
         * Determines whether or not the specified item can be deactivated.
         * @method canDeactivateItem
         * @param {object} item The item to check.
         * @param {boolean} close Whether or not to check if close is possible.
         * @return {promise}
         */
        computed.canDeactivateItem = function (item, close) {
            return canDeactivateItem(item, close, settings);
        };

        /**
         * Deactivates the specified item.
         * @method deactivateItem
         * @param {object} item The item to deactivate.
         * @param {boolean} close Whether or not to close the item.
         * @return {promise}
         */
        computed.deactivateItem = function (item, close) {
            return system.defer(function(dfd) {
                computed.canDeactivateItem(item, close).then(function(canDeactivate) {
                    if (canDeactivate) {
                        deactivate(item, close, settings, dfd, activeItem);
                    } else {
                        computed.notifySubscribers();
                        dfd.resolve(false);
                    }
                });
            }).promise();
        };

        /**
         * Determines whether or not the specified item can be activated.
         * @method canActivateItem
         * @param {object} item The item to check.
         * @param {object} activationData Data associated with the activation.
         * @return {promise}
         */
        computed.canActivateItem = function (newItem, activationData) {
            return canActivateItem(newItem, activeItem, settings, activationData);
        };

        /**
         * Activates the specified item.
         * @method activateItem
         * @param {object} newItem The item to activate.
         * @param {object} newActivationData Data associated with the activation.
         * @return {promise}
         */
        computed.activateItem = function (newItem, newActivationData) {
            var viaSetter = computed.viaSetter;
            computed.viaSetter = false;

            return system.defer(function (dfd) {
                if (computed.isActivating()) {
                    dfd.resolve(false);
                    return;
                }

                computed.isActivating(true);

                var currentItem = activeItem();
                if (settings.areSameItem(currentItem, newItem, activeData, newActivationData)) {
                    computed.isActivating(false);
                    dfd.resolve(true);
                    return;
                }

                computed.canDeactivateItem(currentItem, settings.closeOnDeactivate).then(function (canDeactivate) {
                    if (canDeactivate) {
                        computed.canActivateItem(newItem, newActivationData).then(function (canActivate) {
                            if (canActivate) {
                                system.defer(function (dfd2) {
                                    deactivate(currentItem, settings.closeOnDeactivate, settings, dfd2);
                                }).promise().then(function () {
                                    newItem = settings.beforeActivate(newItem, newActivationData);
                                    activate(newItem, activeItem, function (result) {
                                        activeData = newActivationData;
                                        computed.isActivating(false);
                                        dfd.resolve(result);
                                    }, newActivationData);
                                });
                            } else {
                                if (viaSetter) {
                                    computed.notifySubscribers();
                                }

                                computed.isActivating(false);
                                dfd.resolve(false);
                            }
                        });
                    } else {
                        if (viaSetter) {
                            computed.notifySubscribers();
                        }

                        computed.isActivating(false);
                        dfd.resolve(false);
                    }
                });
            }).promise();
        };

        /**
         * Determines whether or not the activator, in its current state, can be activated.
         * @method canActivate
         * @return {promise}
         */
        computed.canActivate = function () {
            var toCheck;

            if (initialActiveItem) {
                toCheck = initialActiveItem;
                initialActiveItem = false;
            } else {
                toCheck = computed();
            }

            return computed.canActivateItem(toCheck);
        };

        /**
         * Activates the activator, in its current state.
         * @method activate
         * @return {promise}
         */
        computed.activate = function () {
            var toActivate;

            if (initialActiveItem) {
                toActivate = initialActiveItem;
                initialActiveItem = false;
            } else {
                toActivate = computed();
            }

            return computed.activateItem(toActivate);
        };

        /**
         * Determines whether or not the activator, in its current state, can be deactivated.
         * @method canDeactivate
         * @return {promise}
         */
        computed.canDeactivate = function (close) {
            return computed.canDeactivateItem(computed(), close);
        };

        /**
         * Deactivates the activator, in its current state.
         * @method deactivate
         * @return {promise}
         */
        computed.deactivate = function (close) {
            return computed.deactivateItem(computed(), close);
        };

        computed.includeIn = function (includeIn) {
            includeIn.canActivate = function () {
                return computed.canActivate();
            };

            includeIn.activate = function () {
                return computed.activate();
            };

            includeIn.canDeactivate = function (close) {
                return computed.canDeactivate(close);
            };

            includeIn.deactivate = function (close) {
                return computed.deactivate(close);
            };
        };

        if (settings.includeIn) {
            computed.includeIn(settings.includeIn);
        } else if (initialActiveItem) {
            computed.activate();
        }

        computed.forItems = function (items) {
            settings.closeOnDeactivate = false;

            settings.determineNextItemToActivate = function (list, lastIndex) {
                var toRemoveAt = lastIndex - 1;

                if (toRemoveAt == -1 && list.length > 1) {
                    return list[1];
                }

                if (toRemoveAt > -1 && toRemoveAt < list.length - 1) {
                    return list[toRemoveAt];
                }

                return null;
            };

            settings.beforeActivate = function (newItem) {
                var currentItem = computed();

                if (!newItem) {
                    newItem = settings.determineNextItemToActivate(items, currentItem ? items.indexOf(currentItem) : 0);
                } else {
                    var index = items.indexOf(newItem);

                    if (index == -1) {
                        items.push(newItem);
                    } else {
                        newItem = items()[index];
                    }
                }

                return newItem;
            };

            settings.afterDeactivate = function (oldItem, close) {
                if (close) {
                    items.remove(oldItem);
                }
            };

            var originalCanDeactivate = computed.canDeactivate;
            computed.canDeactivate = function (close) {
                if (close) {
                    return system.defer(function (dfd) {
                        var list = items();
                        var results = [];

                        function finish() {
                            for (var j = 0; j < results.length; j++) {
                                if (!results[j]) {
                                    dfd.resolve(false);
                                    return;
                                }
                            }

                            dfd.resolve(true);
                        }

                        for (var i = 0; i < list.length; i++) {
                            computed.canDeactivateItem(list[i], close).then(function (result) {
                                results.push(result);
                                if (results.length == list.length) {
                                    finish();
                                }
                            });
                        }
                    }).promise();
                } else {
                    return originalCanDeactivate();
                }
            };

            var originalDeactivate = computed.deactivate;
            computed.deactivate = function (close) {
                if (close) {
                    return system.defer(function (dfd) {
                        var list = items();
                        var results = 0;
                        var listLength = list.length;

                        function doDeactivate(item) {
                            computed.deactivateItem(item, close).then(function () {
                                results++;
                                items.remove(item);
                                if (results == listLength) {
                                    dfd.resolve();
                                }
                            });
                        }

                        for (var i = 0; i < listLength; i++) {
                            doDeactivate(list[i]);
                        }
                    }).promise();
                } else {
                    return originalDeactivate();
                }
            };

            return computed;
        };

        return computed;
    }

    /**
     * @class ActivatorSettings
     * @static
     */
    var activatorSettings = {
        /**
         * The default value passed to an object's deactivate function as its close parameter.
         * @property {boolean} closeOnDeactivate
         * @default true
         */
        closeOnDeactivate: true,
        /**
         * Lower-cased words which represent a truthy value.
         * @property {string[]} affirmations
         * @default ['yes', 'ok', 'true']
         */
        affirmations: ['yes', 'ok', 'true'],
        /**
         * Interprets the response of a `canActivate` or `canDeactivate` call using the known affirmative values in the `affirmations` array.
         * @method interpretResponse
         * @param {object} value
         * @return {boolean}
         */
        interpretResponse: function(value) {
            if(system.isObject(value)) {
                value = value.can || false;
            }

            if(system.isString(value)) {
                return ko.utils.arrayIndexOf(this.affirmations, value.toLowerCase()) !== -1;
            }

            return value;
        },
        /**
         * Determines whether or not the current item and the new item are the same.
         * @method areSameItem
         * @param {object} currentItem
         * @param {object} newItem
         * @param {object} currentActivationData
         * @param {object} newActivationData
         * @return {boolean}
         */
        areSameItem: function(currentItem, newItem, currentActivationData, newActivationData) {
            return currentItem == newItem;
        },
        /**
         * Called immediately before the new item is activated.
         * @method beforeActivate
         * @param {object} newItem
         */
        beforeActivate: function(newItem) {
            return newItem;
        },
        /**
         * Called immediately after the old item is deactivated.
         * @method afterDeactivate
         * @param {object} oldItem The previous item.
         * @param {boolean} close Whether or not the previous item was closed.
         * @param {function} setter The activate item setter function.
         */
        afterDeactivate: function(oldItem, close, setter) {
            if(close && setter) {
                setter(null);
            }
        }
    };

    /**
     * @class ActivatorModule
     * @static
     */
    activator = {
        /**
         * The default settings used by activators.
         * @property {ActivatorSettings} defaults
         */
        defaults: activatorSettings,
        /**
          * Creates a new activator.
          * @method create
          * @param {object} [initialActiveItem] The item which should be immediately activated upon creation of the ativator.
          * @param {ActivatorSettings} [settings] Per activator overrides of the default activator settings.
          * @return {Activator} The created activator.
          */
        create: createActivator,
        /**
         * Determines whether or not the provided object is an activator or not.
         * @method isActivator
         * @param {object} object Any object you wish to verify as an activator or not.
         * @return {boolean} True if the object is an activator; false otherwise.
         */
        isActivator:function(object){
            return object && object.__activator__;
        }
    };

    return activator;
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The composition module encapsulates all functionality related to visual composition.
 * @module composition
 * @requires system
 * @requires viewLocator
 * @requires binder
 * @requires viewEngine
 * @requires activator
 * @requires jquery
 * @requires knockout
 */
define('durandal/composition',['durandal/system', 'durandal/viewLocator', 'durandal/binder', 'durandal/viewEngine', 'durandal/activator', 'jquery', 'knockout'], function (system, viewLocator, binder, viewEngine, activator, $, ko) {
    var dummyModel = {},
        activeViewAttributeName = 'data-active-view',
        composition,
        compositionCompleteCallbacks = [],
        compositionCount = 0,
        compositionDataKey = 'durandal-composition-data',
        partAttributeName = 'data-part',
        bindableSettings = ['model', 'view', 'transition', 'area', 'strategy', 'activationData'],
        visibilityKey = "durandal-visibility-data",
        composeBindings = ['compose:'];

    function getHostState(parent) {
        var elements = [];
        var state = {
            childElements: elements,
            activeView: null
        };

        var child = ko.virtualElements.firstChild(parent);

        while (child) {
            if (child.nodeType == 1) {
                elements.push(child);
                if (child.getAttribute(activeViewAttributeName)) {
                    state.activeView = child;
                }
            }

            child = ko.virtualElements.nextSibling(child);
        }

        if(!state.activeView){
            state.activeView = elements[0];
        }

        return state;
    }

    function endComposition() {
        compositionCount--;

        if (compositionCount === 0) {
            setTimeout(function(){
                var i = compositionCompleteCallbacks.length;

                while(i--) {
                    try{
                        compositionCompleteCallbacks[i]();
                    }catch(e){
                        system.error(e);
                    }
                }

                compositionCompleteCallbacks = [];
            }, 1);
        }
    }

    function cleanUp(context){
        delete context.activeView;
        delete context.viewElements;
    }

    function tryActivate(context, successCallback, skipActivation) {
        if(skipActivation){
            successCallback();
        } else if (context.activate && context.model && context.model.activate) {
            var result;

            try{
                if(system.isArray(context.activationData)) {
                    result = context.model.activate.apply(context.model, context.activationData);
                } else {
                    result = context.model.activate(context.activationData);
                }

                if(result && result.then) {
                    result.then(successCallback, function(reason) {
                        system.error(reason);
                        successCallback();
                    });
                } else if(result || result === undefined) {
                    successCallback();
                } else {
                    endComposition();
                    cleanUp(context);
                }
            }
            catch(e){
                system.error(e);
            }
        } else {
            successCallback();
        }
    }

    function triggerAttach() {
        var context = this;

        if (context.activeView) {
            context.activeView.removeAttribute(activeViewAttributeName);
        }

        if (context.child) {
            try{
                if (context.model && context.model.attached) {
                    if (context.composingNewView || context.alwaysTriggerAttach) {
                        context.model.attached(context.child, context.parent, context);
                    }
                }

                if (context.attached) {
                    context.attached(context.child, context.parent, context);
                }

                context.child.setAttribute(activeViewAttributeName, true);

                if (context.composingNewView && context.model && context.model.detached) {
                    ko.utils.domNodeDisposal.addDisposeCallback(context.child, function () {
                        try{
                            context.model.detached(context.child, context.parent, context);
                        }catch(e2){
                            system.error(e2);
                        }
                    });
                }
            }catch(e){
                system.error(e);
            }
        }

        context.triggerAttach = system.noop;
    }

    function shouldTransition(context) {
        if (system.isString(context.transition)) {
            if (context.activeView) {
                if (context.activeView == context.child) {
                    return false;
                }

                if (!context.child) {
                    return true;
                }

                if (context.skipTransitionOnSameViewId) {
                    var currentViewId = context.activeView.getAttribute('data-view');
                    var newViewId = context.child.getAttribute('data-view');
                    return currentViewId != newViewId;
                }
            }

            return true;
        }

        return false;
    }

    function cloneNodes(nodesArray) {
        for (var i = 0, j = nodesArray.length, newNodesArray = []; i < j; i++) {
            var clonedNode = nodesArray[i].cloneNode(true);
            newNodesArray.push(clonedNode);
        }
        return newNodesArray;
    }

    function replaceParts(context){
        var parts = cloneNodes(context.parts);
        var replacementParts = composition.getParts(parts, null, true);
        var standardParts = composition.getParts(context.child);

        for (var partId in replacementParts) {
            $(standardParts[partId]).replaceWith(replacementParts[partId]);
        }
    }

    function removePreviousView(context){
        var children = ko.virtualElements.childNodes(context.parent), i, len;

        if(!system.isArray(children)){
            var arrayChildren = [];
            for(i = 0, len = children.length; i < len; i++){
                arrayChildren[i] = children[i];
            }
            children = arrayChildren;
        }

        for(i = 1,len = children.length; i < len; i++){
            ko.removeNode(children[i]);
        }
    }

    function hide(view) {
        ko.utils.domData.set(view, visibilityKey, view.style.display);
        view.style.display = "none";
    }

    function show(view) {
        view.style.display = ko.utils.domData.get(view, visibilityKey);
    }

    function hasComposition(element){
        var dataBind = element.getAttribute('data-bind');
        if(!dataBind){
            return false;
        }

        for(var i = 0, length = composeBindings.length; i < length; i++){
            if(dataBind.indexOf(composeBindings[i]) > -1){
                return true;
            }
        }

        return false;
    }

    /**
     * @class CompositionTransaction
     * @static
     */
    var compositionTransaction = {
        /**
         * Registers a callback which will be invoked when the current composition transaction has completed. The transaction includes all parent and children compositions.
         * @method complete
         * @param {function} callback The callback to be invoked when composition is complete.
         */
        complete: function (callback) {
            compositionCompleteCallbacks.push(callback);
        }
    };

    /**
     * @class CompositionModule
     * @static
     */
    composition = {
        /**
         * An array of all the binding handler names (includeing :) that trigger a composition.
         * @property {string} composeBindings
         * @default ['compose:']
         */
        composeBindings:composeBindings,
        /**
         * Converts a transition name to its moduleId.
         * @method convertTransitionToModuleId
         * @param {string} name The name of the transtion.
         * @return {string} The moduleId.
         */
        convertTransitionToModuleId: function (name) {
            return 'transitions/' + name;
        },
        /**
         * The name of the transition to use in all compositions.
         * @property {string} defaultTransitionName
         * @default null
         */
        defaultTransitionName: null,
        /**
         * Represents the currently executing composition transaction.
         * @property {CompositionTransaction} current
         */
        current: compositionTransaction,
        /**
         * Registers a binding handler that will be invoked when the current composition transaction is complete.
         * @method addBindingHandler
         * @param {string} name The name of the binding handler.
         * @param {object} [config] The binding handler instance. If none is provided, the name will be used to look up an existing handler which will then be converted to a composition handler.
         * @param {function} [initOptionsFactory] If the registered binding needs to return options from its init call back to knockout, this function will server as a factory for those options. It will receive the same parameters that the init function does.
         */
        addBindingHandler:function(name, config, initOptionsFactory){
            var key,
                dataKey = 'composition-handler-' + name,
                handler;

            config = config || ko.bindingHandlers[name];
            initOptionsFactory = initOptionsFactory || function(){ return undefined;  };

            handler = ko.bindingHandlers[name] = {
                init: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    if(compositionCount > 0){
                        var data = {
                            trigger:ko.observable(null)
                        };

                        composition.current.complete(function(){
                            if(config.init){
                                config.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
                            }

                            if(config.update){
                                ko.utils.domData.set(element, dataKey, config);
                                data.trigger('trigger');
                            }
                        });

                        ko.utils.domData.set(element, dataKey, data);
                    }else{
                        ko.utils.domData.set(element, dataKey, config);

                        if(config.init){
                            config.init(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
                        }
                    }

                    return initOptionsFactory(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
                },
                update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    var data = ko.utils.domData.get(element, dataKey);

                    if(data.update){
                        return data.update(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext);
                    }

                    if(data.trigger){
                        data.trigger();
                    }
                }
            };

            for (key in config) {
                if (key !== "init" && key !== "update") {
                    handler[key] = config[key];
                }
            }
        },
        /**
         * Gets an object keyed with all the elements that are replacable parts, found within the supplied elements. The key will be the part name and the value will be the element itself.
         * @method getParts
         * @param {DOMElement\DOMElement[]} elements The element(s) to search for parts.
         * @return {object} An object keyed by part.
         */
        getParts: function(elements, parts, isReplacementSearch) {
            parts = parts || {};

            if (!elements) {
                return parts;
            }

            if (elements.length === undefined) {
                elements = [elements];
            }

            for (var i = 0, length = elements.length; i < length; i++) {
                var element = elements[i];

                if (element.getAttribute) {
                    if(!isReplacementSearch && hasComposition(element)){
                        continue;
                    }

                    var id = element.getAttribute(partAttributeName);
                    if (id) {
                        parts[id] = element;
                    }

                    if(!isReplacementSearch && element.hasChildNodes()){
                        composition.getParts(element.childNodes, parts);
                    }
                }
            }

            return parts;
        },
        cloneNodes:cloneNodes,
        finalize: function (context) {
            if(context.transition === undefined) {
                context.transition = this.defaultTransitionName;
            }

            if(!context.child && !context.activeView){
                if (!context.cacheViews) {
                    ko.virtualElements.emptyNode(context.parent);
                }

                context.triggerAttach();
                endComposition();
                cleanUp(context);
            }else if (shouldTransition(context)) {
                var transitionModuleId = this.convertTransitionToModuleId(context.transition);

                system.acquire(transitionModuleId).then(function (transition) {
                    context.transition = transition;

                    transition(context).then(function () {
                        if (!context.cacheViews) {
                            if(!context.child){
                                ko.virtualElements.emptyNode(context.parent);
                            }else{
                                removePreviousView(context);
                            }
                        }else if(context.activeView){
                            var instruction = binder.getBindingInstruction(context.activeView);
                            if(instruction && instruction.cacheViews != undefined && !instruction.cacheViews){
                                ko.removeNode(context.activeView);
                            }
                        }

                        context.triggerAttach();
                        endComposition();
                        cleanUp(context);
                    });
                }).fail(function(err){
                    system.error('Failed to load transition (' + transitionModuleId + '). Details: ' + err.message);
                });
            } else {
                if (context.child != context.activeView) {
                    if (context.cacheViews && context.activeView) {
                        var instruction = binder.getBindingInstruction(context.activeView);
                        if(!instruction || (instruction.cacheViews != undefined && !instruction.cacheViews)){
                            ko.removeNode(context.activeView);
                        }else{
                            hide(context.activeView);
                        }
                    }

                    if (!context.child) {
                        if (!context.cacheViews) {
                            ko.virtualElements.emptyNode(context.parent);
                        }
                    } else {
                        if (!context.cacheViews) {
                            removePreviousView(context);
                        }

                        show(context.child);
                    }
                }

                context.triggerAttach();
                endComposition();
                cleanUp(context);
            }
        },
        bindAndShow: function (child, context, skipActivation) {
            context.child = child;

            if (context.cacheViews) {
                context.composingNewView = (ko.utils.arrayIndexOf(context.viewElements, child) == -1);
            } else {
                context.composingNewView = true;
            }

            tryActivate(context, function () {
                if (context.binding) {
                    context.binding(context.child, context.parent, context);
                }

                if (context.preserveContext && context.bindingContext) {
                    if (context.composingNewView) {
                        if(context.parts){
                            replaceParts(context);
                        }

                        hide(child);
                        ko.virtualElements.prepend(context.parent, child);

                        binder.bindContext(context.bindingContext, child, context.model);
                    }
                } else if (child) {
                    var modelToBind = context.model || dummyModel;
                    var currentModel = ko.dataFor(child);

                    if (currentModel != modelToBind) {
                        if (!context.composingNewView) {
                            ko.removeNode(child);
                            viewEngine.createView(child.getAttribute('data-view')).then(function(recreatedView) {
                                composition.bindAndShow(recreatedView, context, true);
                            });
                            return;
                        }

                        if(context.parts){
                            replaceParts(context);
                        }

                        hide(child);
                        ko.virtualElements.prepend(context.parent, child);

                        binder.bind(modelToBind, child);
                    }
                }

                composition.finalize(context);
            }, skipActivation);
        },
        /**
         * Eecutes the default view location strategy.
         * @method defaultStrategy
         * @param {object} context The composition context containing the model and possibly existing viewElements.
         * @return {promise} A promise for the view.
         */
        defaultStrategy: function (context) {
            return viewLocator.locateViewForObject(context.model, context.area, context.viewElements);
        },
        getSettings: function (valueAccessor, element) {
            var value = valueAccessor(),
                settings = ko.utils.unwrapObservable(value) || {},
                activatorPresent = activator.isActivator(value),
                moduleId;

            if (system.isString(settings)) {
                if (viewEngine.isViewUrl(settings)) {
                    settings = {
                        view: settings
                    };
                } else {
                    settings = {
                        model: settings,
                        activate: true
                    };
                }

                return settings;
            }

            moduleId = system.getModuleId(settings);
            if (moduleId) {
                settings = {
                    model: settings,
                    activate: true
                };

                return settings;
            }

            if(!activatorPresent && settings.model) {
                activatorPresent = activator.isActivator(settings.model);
            }

            for (var attrName in settings) {
                if (ko.utils.arrayIndexOf(bindableSettings, attrName) != -1) {
                    settings[attrName] = ko.utils.unwrapObservable(settings[attrName]);
                } else {
                    settings[attrName] = settings[attrName];
                }
            }

            if (activatorPresent) {
                settings.activate = false;
            } else if (settings.activate === undefined) {
                settings.activate = true;
            }

            return settings;
        },
        executeStrategy: function (context) {
            context.strategy(context).then(function (child) {
                composition.bindAndShow(child, context);
            });
        },
        inject: function (context) {
            if (!context.model) {
                this.bindAndShow(null, context);
                return;
            }

            if (context.view) {
                viewLocator.locateView(context.view, context.area, context.viewElements).then(function (child) {
                    composition.bindAndShow(child, context);
                });
                return;
            }

            if (!context.strategy) {
                context.strategy = this.defaultStrategy;
            }

            if (system.isString(context.strategy)) {
                system.acquire(context.strategy).then(function (strategy) {
                    context.strategy = strategy;
                    composition.executeStrategy(context);
                }).fail(function(err){
                    system.error('Failed to load view strategy (' + context.strategy + '). Details: ' + err.message);
                });
            } else {
                this.executeStrategy(context);
            }
        },
        /**
         * Initiates a composition.
         * @method compose
         * @param {DOMElement} element The DOMElement or knockout virtual element that serves as the parent for the composition.
         * @param {object} settings The composition settings.
         * @param {object} [bindingContext] The current binding context.
         */
        compose: function (element, settings, bindingContext, fromBinding) {
            compositionCount++;

            if(!fromBinding){
                settings = composition.getSettings(function() { return settings; }, element);
            }

            if (settings.compositionComplete) {
                compositionCompleteCallbacks.push(function () {
                    settings.compositionComplete(settings.child, settings.parent, settings);
                });
            }

            compositionCompleteCallbacks.push(function () {
                if(settings.composingNewView && settings.model && settings.model.compositionComplete){
                    settings.model.compositionComplete(settings.child, settings.parent, settings);
                }
            });

            var hostState = getHostState(element);

            settings.activeView = hostState.activeView;
            settings.parent = element;
            settings.triggerAttach = triggerAttach;
            settings.bindingContext = bindingContext;

            if (settings.cacheViews && !settings.viewElements) {
                settings.viewElements = hostState.childElements;
            }

            if (!settings.model) {
                if (!settings.view) {
                    this.bindAndShow(null, settings);
                } else {
                    settings.area = settings.area || 'partial';
                    settings.preserveContext = true;

                    viewLocator.locateView(settings.view, settings.area, settings.viewElements).then(function (child) {
                        composition.bindAndShow(child, settings);
                    });
                }
            } else if (system.isString(settings.model)) {
                system.acquire(settings.model).then(function (module) {
                    settings.model = system.resolveObject(module);
                    composition.inject(settings);
                }).fail(function(err){
                    system.error('Failed to load composed module (' + settings.model + '). Details: ' + err.message);
                });
            } else {
                composition.inject(settings);
            }
        }
    };

    ko.bindingHandlers.compose = {
        init: function() {
            return { controlsDescendantBindings: true };
        },
        update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
            var settings = composition.getSettings(valueAccessor, element);
            if(settings.mode){
                var data = ko.utils.domData.get(element, compositionDataKey);
                if(!data){
                    var childNodes = ko.virtualElements.childNodes(element);
                    data = {};

                    if(settings.mode === 'inline'){
                        data.view = viewEngine.ensureSingleElement(childNodes);
                    }else if(settings.mode === 'templated'){
                        data.parts = cloneNodes(childNodes);
                    }

                    ko.virtualElements.emptyNode(element);
                    ko.utils.domData.set(element, compositionDataKey, data);
                }

                if(settings.mode === 'inline'){
                    settings.view = data.view.cloneNode(true);
                }else if(settings.mode === 'templated'){
                    settings.parts = data.parts;
                }

                settings.preserveContext = true;
            }

            composition.compose(element, settings, bindingContext, true);
        }
    };

    ko.virtualElements.allowedBindings.compose = true;

    return composition;
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Durandal events originate from backbone.js but also combine some ideas from signals.js as well as some additional improvements.
 * Events can be installed into any object and are installed into the `app` module by default for convenient app-wide eventing.
 * @module events
 * @requires system
 */
define('durandal/events',['durandal/system'], function (system) {
    var eventSplitter = /\s+/;
    var Events = function() { };

    /**
     * Represents an event subscription.
     * @class Subscription
     */
    var Subscription = function(owner, events) {
        this.owner = owner;
        this.events = events;
    };

    /**
     * Attaches a callback to the event subscription.
     * @method then
     * @param {function} callback The callback function to invoke when the event is triggered.
     * @param {object} [context] An object to use as `this` when invoking the `callback`.
     * @chainable
     */
    Subscription.prototype.then = function (callback, context) {
        this.callback = callback || this.callback;
        this.context = context || this.context;
        
        if (!this.callback) {
            return this;
        }

        this.owner.on(this.events, this.callback, this.context);
        return this;
    };

    /**
     * Attaches a callback to the event subscription.
     * @method on
     * @param {function} [callback] The callback function to invoke when the event is triggered. If `callback` is not provided, the previous callback will be re-activated.
     * @param {object} [context] An object to use as `this` when invoking the `callback`.
     * @chainable
     */
    Subscription.prototype.on = Subscription.prototype.then;

    /**
     * Cancels the subscription.
     * @method off
     * @chainable
     */
    Subscription.prototype.off = function () {
        this.owner.off(this.events, this.callback, this.context);
        return this;
    };

    /**
     * Creates an object with eventing capabilities.
     * @class Events
     */

    /**
     * Creates a subscription or registers a callback for the specified event.
     * @method on
     * @param {string} events One or more events, separated by white space.
     * @param {function} [callback] The callback function to invoke when the event is triggered. If `callback` is not provided, a subscription instance is returned.
     * @param {object} [context] An object to use as `this` when invoking the `callback`.
     * @return {Subscription|Events} A subscription is returned if no callback is supplied, otherwise the events object is returned for chaining.
     */
    Events.prototype.on = function(events, callback, context) {
        var calls, event, list;

        if (!callback) {
            return new Subscription(this, events);
        } else {
            calls = this.callbacks || (this.callbacks = {});
            events = events.split(eventSplitter);

            while (event = events.shift()) {
                list = calls[event] || (calls[event] = []);
                list.push(callback, context);
            }

            return this;
        }
    };

    /**
     * Removes the callbacks for the specified events.
     * @method off
     * @param {string} [events] One or more events, separated by white space to turn off. If no events are specified, then the callbacks will be removed.
     * @param {function} [callback] The callback function to remove. If `callback` is not provided, all callbacks for the specified events will be removed.
     * @param {object} [context] The object that was used as `this`. Callbacks with this context will be removed.
     * @chainable
     */
    Events.prototype.off = function(events, callback, context) {
        var event, calls, list, i;

        // No events
        if (!(calls = this.callbacks)) {
            return this;
        }

        //removing all
        if (!(events || callback || context)) {
            delete this.callbacks;
            return this;
        }

        events = events ? events.split(eventSplitter) : system.keys(calls);

        // Loop through the callback list, splicing where appropriate.
        while (event = events.shift()) {
            if (!(list = calls[event]) || !(callback || context)) {
                delete calls[event];
                continue;
            }

            for (i = list.length - 2; i >= 0; i -= 2) {
                if (!(callback && list[i] !== callback || context && list[i + 1] !== context)) {
                    list.splice(i, 2);
                }
            }
        }

        return this;
    };

    /**
     * Triggers the specified events.
     * @method trigger
     * @param {string} [events] One or more events, separated by white space to trigger.
     * @chainable
     */
    Events.prototype.trigger = function(events) {
        var event, calls, list, i, length, args, all, rest;
        if (!(calls = this.callbacks)) {
            return this;
        }

        rest = [];
        events = events.split(eventSplitter);
        for (i = 1, length = arguments.length; i < length; i++) {
            rest[i - 1] = arguments[i];
        }

        // For each event, walk through the list of callbacks twice, first to
        // trigger the event, then to trigger any `"all"` callbacks.
        while (event = events.shift()) {
            // Copy callback lists to prevent modification.
            if (all = calls.all) {
                all = all.slice();
            }

            if (list = calls[event]) {
                list = list.slice();
            }

            // Execute event callbacks.
            if (list) {
                for (i = 0, length = list.length; i < length; i += 2) {
                    list[i].apply(list[i + 1] || this, rest);
                }
            }

            // Execute "all" callbacks.
            if (all) {
                args = [event].concat(rest);
                for (i = 0, length = all.length; i < length; i += 2) {
                    all[i].apply(all[i + 1] || this, args);
                }
            }
        }

        return this;
    };

    /**
     * Creates a function that will trigger the specified events when called. Simplifies proxying jQuery (or other) events through to the events object.
     * @method proxy
     * @param {string} events One or more events, separated by white space to trigger by invoking the returned function.
     * @return {function} Calling the function will invoke the previously specified events on the events object.
     */
    Events.prototype.proxy = function(events) {
        var that = this;
        return (function(arg) {
            that.trigger(events, arg);
        });
    };

    /**
     * Creates an object with eventing capabilities.
     * @class EventsModule
     * @static
     */

    /**
     * Adds eventing capabilities to the specified object.
     * @method includeIn
     * @param {object} targetObject The object to add eventing capabilities to.
     */
    Events.includeIn = function(targetObject) {
        targetObject.on = Events.prototype.on;
        targetObject.off = Events.prototype.off;
        targetObject.trigger = Events.prototype.trigger;
        targetObject.proxy = Events.prototype.proxy;
    };

    return Events;
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The app module controls app startup, plugin loading/configuration and root visual display.
 * @module app
 * @requires system
 * @requires viewEngine
 * @requires composition
 * @requires events
 * @requires jquery
 */
define('durandal/app',['durandal/system', 'durandal/viewEngine', 'durandal/composition', 'durandal/events', 'jquery'], function(system, viewEngine, composition, Events, $) {
    var app,
        allPluginIds = [],
        allPluginConfigs = [];

    function loadPlugins(){
        return system.defer(function(dfd){
            if(allPluginIds.length == 0){
                dfd.resolve();
                return;
            }

            system.acquire(allPluginIds).then(function(loaded){
                for(var i = 0; i < loaded.length; i++){
                    var currentModule = loaded[i];

                    if(currentModule.install){
                        var config = allPluginConfigs[i];
                        if(!system.isObject(config)){
                            config = {};
                        }

                        currentModule.install(config);
                        system.log('Plugin:Installed ' + allPluginIds[i]);
                    }else{
                        system.log('Plugin:Loaded ' + allPluginIds[i]);
                    }
                }

                dfd.resolve();
            }).fail(function(err){
                system.error('Failed to load plugin(s). Details: ' + err.message);
            });
        }).promise();
    }

    /**
     * @class AppModule
     * @static
     * @uses Events
     */
    app = {
        /**
         * The title of your application.
         * @property {string} title
         */
        title: 'Application',
        /**
         * Configures one or more plugins to be loaded and installed into the application.
         * @method configurePlugins
         * @param {object} config Keys are plugin names. Values can be truthy, to simply install the plugin, or a configuration object to pass to the plugin.
         * @param {string} [baseUrl] The base url to load the plugins from.
         */
        configurePlugins:function(config, baseUrl){
            var pluginIds = system.keys(config);
            baseUrl = baseUrl || 'plugins/';

            if(baseUrl.indexOf('/', baseUrl.length - 1) === -1){
                baseUrl += '/';
            }

            for(var i = 0; i < pluginIds.length; i++){
                var key = pluginIds[i];
                allPluginIds.push(baseUrl + key);
                allPluginConfigs.push(config[key]);
            }
        },
        /**
         * Starts the application.
         * @method start
         * @return {promise}
         */
        start: function() {
            system.log('Application:Starting');

            if (this.title) {
                document.title = this.title;
            }

            return system.defer(function (dfd) {
                $(function() {
                    loadPlugins().then(function(){
                        dfd.resolve();
                        system.log('Application:Started');
                    });
                });
            }).promise();
        },
        /**
         * Sets the root module/view for the application.
         * @method setRoot
         * @param {string} root The root view or module.
         * @param {string} [transition] The transition to use from the previous root (or splash screen) into the new root.
         * @param {string} [applicationHost] The application host element or id. By default the id 'applicationHost' will be used.
         */
        setRoot: function(root, transition, applicationHost) {
            var hostElement, settings = { activate:true, transition: transition };

            if (!applicationHost || system.isString(applicationHost)) {
                hostElement = document.getElementById(applicationHost || 'applicationHost');
            } else {
                hostElement = applicationHost;
            }

            if (system.isString(root)) {
                if (viewEngine.isViewUrl(root)) {
                    settings.view = root;
                } else {
                    settings.model = root;
                }
            } else {
                settings.model = root;
            }

            composition.compose(hostElement, settings);
        }
    };

    Events.includeIn(app);

    return app;
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The system module encapsulates the most basic features used by other modules.
 * @module system
 * @requires require
 * @requires jquery
 */
define('services/../../Scripts/durandal/system',['require', 'jquery'], function(require, $) {
    var isDebugging = false,
        nativeKeys = Object.keys,
        hasOwnProperty = Object.prototype.hasOwnProperty,
        toString = Object.prototype.toString,
        system,
        treatAsIE8 = false,
        nativeIsArray = Array.isArray,
        slice = Array.prototype.slice;

    //see http://patik.com/blog/complete-cross-browser-console-log/
    // Tell IE9 to use its built-in console
    if (Function.prototype.bind && (typeof console === 'object' || typeof console === 'function') && typeof console.log == 'object') {
        try {
            ['log', 'info', 'warn', 'error', 'assert', 'dir', 'clear', 'profile', 'profileEnd']
                .forEach(function(method) {
                    console[method] = this.call(console[method], console);
                }, Function.prototype.bind);
        } catch (ex) {
            treatAsIE8 = true;
        }
    }

    // callback for dojo's loader 
    // note: if you wish to use Durandal with dojo's AMD loader,
    // currently you must fork the dojo source with the following
    // dojo/dojo.js, line 1187, the last line of the finishExec() function: 
    //  (add) signal("moduleLoaded", [module.result, module.mid]);
    // an enhancement request has been submitted to dojo to make this
    // a permanent change. To view the status of this request, visit:
    // http://bugs.dojotoolkit.org/ticket/16727

    if (require.on) {
        require.on("moduleLoaded", function(module, mid) {
            system.setModuleId(module, mid);
        });
    }

    // callback for require.js loader
    if (typeof requirejs !== 'undefined') {
        requirejs.onResourceLoad = function(context, map, depArray) {
            system.setModuleId(context.defined[map.id], map.id);
        };
    }

    var noop = function() { };

    var log = function() {
        try {
            // Modern browsers
            if (typeof console != 'undefined' && typeof console.log == 'function') {
                // Opera 11
                if (window.opera) {
                    var i = 0;
                    while (i < arguments.length) {
                        console.log('Item ' + (i + 1) + ': ' + arguments[i]);
                        i++;
                    }
                }
                // All other modern browsers
                else if ((slice.call(arguments)).length == 1 && typeof slice.call(arguments)[0] == 'string') {
                    console.log((slice.call(arguments)).toString());
                } else {
                    console.log.apply(console, slice.call(arguments));
                }
            }
            // IE8
            else if ((!Function.prototype.bind || treatAsIE8) && typeof console != 'undefined' && typeof console.log == 'object') {
                Function.prototype.call.call(console.log, console, slice.call(arguments));
            }

            // IE7 and lower, and other old browsers
        } catch (ignore) { }
    };

    var logError = function(error) {
        if(error instanceof Error){
            throw error;
        }

        throw new Error(error);
    };

    /**
     * @class SystemModule
     * @static
     */
    system = {
        /**
         * Durandal's version.
         * @property {string} version
         */
        version: "2.0.1",
        /**
         * A noop function.
         * @method noop
         */
        noop: noop,
        /**
         * Gets the module id for the specified object.
         * @method getModuleId
         * @param {object} obj The object whose module id you wish to determine.
         * @return {string} The module id.
         */
        getModuleId: function(obj) {
            if (!obj) {
                return null;
            }

            if (typeof obj == 'function') {
                return obj.prototype.__moduleId__;
            }

            if (typeof obj == 'string') {
                return null;
            }

            return obj.__moduleId__;
        },
        /**
         * Sets the module id for the specified object.
         * @method setModuleId
         * @param {object} obj The object whose module id you wish to set.
         * @param {string} id The id to set for the specified object.
         */
        setModuleId: function(obj, id) {
            if (!obj) {
                return;
            }

            if (typeof obj == 'function') {
                obj.prototype.__moduleId__ = id;
                return;
            }

            if (typeof obj == 'string') {
                return;
            }

            obj.__moduleId__ = id;
        },
        /**
         * Resolves the default object instance for a module. If the module is an object, the module is returned. If the module is a function, that function is called with `new` and it's result is returned.
         * @method resolveObject
         * @param {object} module The module to use to get/create the default object for.
         * @return {object} The default object for the module.
         */
        resolveObject: function(module) {
            if (system.isFunction(module)) {
                return new module();
            } else {
                return module;
            }
        },
        /**
         * Gets/Sets whether or not Durandal is in debug mode.
         * @method debug
         * @param {boolean} [enable] Turns on/off debugging.
         * @return {boolean} Whether or not Durandal is current debugging.
         */
        debug: function(enable) {
            if (arguments.length == 1) {
                isDebugging = enable;
                if (isDebugging) {
                    this.log = log;
                    this.error = logError;
                    this.log('Debug:Enabled');
                } else {
                    this.log('Debug:Disabled');
                    this.log = noop;
                    this.error = noop;
                }
            }

            return isDebugging;
        },
        /**
         * Logs data to the console. Pass any number of parameters to be logged. Log output is not processed if the framework is not running in debug mode.
         * @method log
         * @param {object} info* The objects to log.
         */
        log: noop,
        /**
         * Logs an error.
         * @method error
         * @param {string|Error} obj The error to report.
         */
        error: noop,
        /**
         * Asserts a condition by throwing an error if the condition fails.
         * @method assert
         * @param {boolean} condition The condition to check.
         * @param {string} message The message to report in the error if the condition check fails.
         */
        assert: function (condition, message) {
            if (!condition) {
                system.error(new Error(message || 'Assert:Failed'));
            }
        },
        /**
         * Creates a deferred object which can be used to create a promise. Optionally pass a function action to perform which will be passed an object used in resolving the promise.
         * @method defer
         * @param {function} [action] The action to defer. You will be passed the deferred object as a paramter.
         * @return {Deferred} The deferred object.
         */
        defer: function(action) {
            return $.Deferred(action);
        },
        /**
         * Creates a simple V4 UUID. This should not be used as a PK in your database. It can be used to generate internal, unique ids. For a more robust solution see [node-uuid](https://github.com/broofa/node-uuid).
         * @method guid
         * @return {string} The guid.
         */
        guid: function() {
            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
        },
        /**
         * Uses require.js to obtain a module. This function returns a promise which resolves with the module instance. You can pass more than one module id to this function or an array of ids. If more than one or an array is passed, then the promise will resolve with an array of module instances.
         * @method acquire
         * @param {string|string[]} moduleId The id(s) of the modules to load.
         * @return {Promise} A promise for the loaded module(s).
         */
        acquire: function() {
            var modules,
                first = arguments[0],
                arrayRequest = false;

            if(system.isArray(first)){
                modules = first;
                arrayRequest = true;
            }else{
                modules = slice.call(arguments, 0);
            }

            return this.defer(function(dfd) {
                require(modules, function() {
                    var args = arguments;
                    setTimeout(function() {
                        if(args.length > 1 || arrayRequest){
                            dfd.resolve(slice.call(args, 0));
                        }else{
                            dfd.resolve(args[0]);
                        }
                    }, 1);
                }, function(err){
                    dfd.reject(err);
                });
            }).promise();
        },
        /**
         * Extends the first object with the properties of the following objects.
         * @method extend
         * @param {object} obj The target object to extend.
         * @param {object} extension* Uses to extend the target object.
         */
        extend: function(obj) {
            var rest = slice.call(arguments, 1);

            for (var i = 0; i < rest.length; i++) {
                var source = rest[i];

                if (source) {
                    for (var prop in source) {
                        obj[prop] = source[prop];
                    }
                }
            }

            return obj;
        },
        /**
         * Uses a setTimeout to wait the specified milliseconds.
         * @method wait
         * @param {number} milliseconds The number of milliseconds to wait.
         * @return {Promise}
         */
        wait: function(milliseconds) {
            return system.defer(function(dfd) {
                setTimeout(dfd.resolve, milliseconds);
            }).promise();
        }
    };

    /**
     * Gets all the owned keys of the specified object.
     * @method keys
     * @param {object} object The object whose owned keys should be returned.
     * @return {string[]} The keys.
     */
    system.keys = nativeKeys || function(obj) {
        if (obj !== Object(obj)) {
            throw new TypeError('Invalid object');
        }

        var keys = [];

        for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
                keys[keys.length] = key;
            }
        }

        return keys;
    };

    /**
     * Determines if the specified object is an html element.
     * @method isElement
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isElement = function(obj) {
        return !!(obj && obj.nodeType === 1);
    };

    /**
     * Determines if the specified object is an array.
     * @method isArray
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isArray = nativeIsArray || function(obj) {
        return toString.call(obj) == '[object Array]';
    };

    /**
     * Determines if the specified object is...an object. ie. Not an array, string, etc.
     * @method isObject
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isObject = function(obj) {
        return obj === Object(obj);
    };

    /**
     * Determines if the specified object is a boolean.
     * @method isBoolean
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isBoolean = function(obj) {
        return typeof(obj) === "boolean";
    };

    /**
     * Determines if the specified object is a promise.
     * @method isPromise
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */
    system.isPromise = function(obj) {
        return obj && system.isFunction(obj.then);
    };

    /**
     * Determines if the specified object is a function arguments object.
     * @method isArguments
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a function.
     * @method isFunction
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a string.
     * @method isString
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a number.
     * @method isNumber
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a date.
     * @method isDate
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    /**
     * Determines if the specified object is a boolean.
     * @method isBoolean
     * @param {object} object The object to check.
     * @return {boolean} True if matches the type, false otherwise.
     */

    //isArguments, isFunction, isString, isNumber, isDate, isRegExp.
    var isChecks = ['Arguments', 'Function', 'String', 'Number', 'Date', 'RegExp'];

    function makeIsFunction(name) {
        var value = '[object ' + name + ']';
        system['is' + name] = function(obj) {
            return toString.call(obj) == value;
        };
    }

    for (var i = 0; i < isChecks.length; i++) {
        makeIsFunction(isChecks[i]);
    }

    return system;
});

define('services/logger',['../../Scripts/durandal/system'],
    function (system) {
        var logger = {
            log: log,
            logError: logError
        };

        return logger;

        function log(message, data, source, showToast) {
            logIt(message, data, source, showToast, 'info');
        }

        function logError(message, data, source, showToast) {
            logIt(message, data, source, showToast, 'error');
        }

        function logIt(message, data, source, showToast, toastType) {
            source = source ? '[' + source + '] ' : '';
            if (data) {
                system.log(source, message, data);
            } else {
                system.log(source, message);
            }
            if (showToast) {
                if (toastType === 'error') {
                    toastr.error(message);
                } else {
                    toastr.info(message);
                }

            }

        }
    });
/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * This module is based on Backbone's core history support. It abstracts away the low level details of working with browser history and url changes in order to provide a solid foundation for a router.
 * @module history
 * @requires system
 * @requires jquery
 */
define('plugins/history',['durandal/system', 'jquery'], function (system, $) {
    // Cached regex for stripping a leading hash/slash and trailing space.
    var routeStripper = /^[#\/]|\s+$/g;

    // Cached regex for stripping leading and trailing slashes.
    var rootStripper = /^\/+|\/+$/g;

    // Cached regex for detecting MSIE.
    var isExplorer = /msie [\w.]+/;

    // Cached regex for removing a trailing slash.
    var trailingSlash = /\/$/;

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    function updateHash(location, fragment, replace) {
        if (replace) {
            var href = location.href.replace(/(javascript:|#).*$/, '');
            location.replace(href + '#' + fragment);
        } else {
            // Some browsers require that `hash` contains a leading #.
            location.hash = '#' + fragment;
        }
    };

    /**
     * @class HistoryModule
     * @static
     */
    var history = {
        /**
         * The setTimeout interval used when the browser does not support hash change events.
         * @property {string} interval
         * @default 50
         */
        interval: 50,
        /**
         * Indicates whether or not the history module is actively tracking history.
         * @property {string} active
         */
        active: false
    };
    
    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
        history.location = window.location;
        history.history = window.history;
    }

    /**
     * Gets the true hash value. Cannot use location.hash directly due to a bug in Firefox where location.hash will always be decoded.
     * @method getHash
     * @param {string} [window] The optional window instance
     * @return {string} The hash.
     */
    history.getHash = function(window) {
        var match = (window || history).location.href.match(/#(.*)$/);
        return match ? match[1] : '';
    };
    
    /**
     * Get the cross-browser normalized URL fragment, either from the URL, the hash, or the override.
     * @method getFragment
     * @param {string} fragment The fragment.
     * @param {boolean} forcePushState Should we force push state?
     * @return {string} he fragment.
     */
    history.getFragment = function(fragment, forcePushState) {
        if (fragment == null) {
            if (history._hasPushState || !history._wantsHashChange || forcePushState) {
                fragment = history.location.pathname + history.location.search;
                var root = history.root.replace(trailingSlash, '');
                if (!fragment.indexOf(root)) {
                    fragment = fragment.substr(root.length);
                }
            } else {
                fragment = history.getHash();
            }
        }
        
        return fragment.replace(routeStripper, '');
    };

    /**
     * Activate the hash change handling, returning `true` if the current URL matches an existing route, and `false` otherwise.
     * @method activate
     * @param {HistoryOptions} options.
     * @return {boolean|undefined} Returns true/false from loading the url unless the silent option was selected.
     */
    history.activate = function(options) {
        if (history.active) {
            system.error("History has already been activated.");
        }

        history.active = true;

        // Figure out the initial configuration. Do we need an iframe?
        // Is pushState desired ... is it available?
        history.options = system.extend({}, { root: '/' }, history.options, options);
        history.root = history.options.root;
        history._wantsHashChange = history.options.hashChange !== false;
        history._wantsPushState = !!history.options.pushState;
        history._hasPushState = !!(history.options.pushState && history.history && history.history.pushState);

        var fragment = history.getFragment();
        var docMode = document.documentMode;
        var oldIE = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7));

        // Normalize root to always include a leading and trailing slash.
        history.root = ('/' + history.root + '/').replace(rootStripper, '/');

        if (oldIE && history._wantsHashChange) {
            history.iframe = $('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo('body')[0].contentWindow;
            history.navigate(fragment, false);
        }

        // Depending on whether we're using pushState or hashes, and whether
        // 'onhashchange' is supported, determine how we check the URL state.
        if (history._hasPushState) {
            $(window).on('popstate', history.checkUrl);
        } else if (history._wantsHashChange && ('onhashchange' in window) && !oldIE) {
            $(window).on('hashchange', history.checkUrl);
        } else if (history._wantsHashChange) {
            history._checkUrlInterval = setInterval(history.checkUrl, history.interval);
        }

        // Determine if we need to change the base url, for a pushState link
        // opened by a non-pushState browser.
        history.fragment = fragment;
        var loc = history.location;
        var atRoot = loc.pathname.replace(/[^\/]$/, '$&/') === history.root;

        // Transition from hashChange to pushState or vice versa if both are requested.
        if (history._wantsHashChange && history._wantsPushState) {
            // If we've started off with a route from a `pushState`-enabled
            // browser, but we're currently in a browser that doesn't support it...
            if (!history._hasPushState && !atRoot) {
                history.fragment = history.getFragment(null, true);
                history.location.replace(history.root + history.location.search + '#' + history.fragment);
                // Return immediately as browser will do redirect to new url
                return true;

            // Or if we've started out with a hash-based route, but we're currently
            // in a browser where it could be `pushState`-based instead...
            } else if (history._hasPushState && atRoot && loc.hash) {
                this.fragment = history.getHash().replace(routeStripper, '');
                this.history.replaceState({}, document.title, history.root + history.fragment + loc.search);
            }
        }

        if (!history.options.silent) {
            return history.loadUrl();
        }
    };

    /**
     * Disable history, perhaps temporarily. Not useful in a real app, but possibly useful for unit testing Routers.
     * @method deactivate
     */
    history.deactivate = function() {
        $(window).off('popstate', history.checkUrl).off('hashchange', history.checkUrl);
        clearInterval(history._checkUrlInterval);
        history.active = false;
    };

    /**
     * Checks the current URL to see if it has changed, and if it has, calls `loadUrl`, normalizing across the hidden iframe.
     * @method checkUrl
     * @return {boolean} Returns true/false from loading the url.
     */
    history.checkUrl = function() {
        var current = history.getFragment();
        if (current === history.fragment && history.iframe) {
            current = history.getFragment(history.getHash(history.iframe));
        }

        if (current === history.fragment) {
            return false;
        }

        if (history.iframe) {
            history.navigate(current, false);
        }
        
        history.loadUrl();
    };
    
    /**
     * Attempts to load the current URL fragment. A pass-through to options.routeHandler.
     * @method loadUrl
     * @return {boolean} Returns true/false from the route handler.
     */
    history.loadUrl = function(fragmentOverride) {
        var fragment = history.fragment = history.getFragment(fragmentOverride);

        return history.options.routeHandler ?
            history.options.routeHandler(fragment) :
            false;
    };

    /**
     * Save a fragment into the hash history, or replace the URL state if the
     * 'replace' option is passed. You are responsible for properly URL-encoding
     * the fragment in advance.
     * The options object can contain `trigger: false` if you wish to not have the
     * route callback be fired, or `replace: true`, if
     * you wish to modify the current URL without adding an entry to the history.
     * @method navigate
     * @param {string} fragment The url fragment to navigate to.
     * @param {object|boolean} options An options object with optional trigger and replace flags. You can also pass a boolean directly to set the trigger option. Trigger is `true` by default.
     * @return {boolean} Returns true/false from loading the url.
     */
    history.navigate = function(fragment, options) {
        if (!history.active) {
            return false;
        }

        if(options === undefined) {
            options = {
                trigger: true
            };
        }else if(system.isBoolean(options)) {
            options = {
                trigger: options
            };
        }

        fragment = history.getFragment(fragment || '');

        if (history.fragment === fragment) {
            return;
        }

        history.fragment = fragment;

        var url = history.root + fragment;

        // Don't include a trailing slash on the root.
        if(fragment === '' && url !== '/') {
            url = url.slice(0, -1);
        }

        // If pushState is available, we use it to set the fragment as a real URL.
        if (history._hasPushState) {
            history.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

            // If hash changes haven't been explicitly disabled, update the hash
            // fragment to store history.
        } else if (history._wantsHashChange) {
            updateHash(history.location, fragment, options.replace);
            
            if (history.iframe && (fragment !== history.getFragment(history.getHash(history.iframe)))) {
                // Opening and closing the iframe tricks IE7 and earlier to push a
                // history entry on hash-tag change.  When replace is true, we don't
                // want history.
                if (!options.replace) {
                    history.iframe.document.open().close();
                }
                
                updateHash(history.iframe.location, fragment, options.replace);
            }

            // If you've told us that you explicitly don't want fallback hashchange-
            // based history, then `navigate` becomes a page refresh.
        } else {
            return history.location.assign(url);
        }

        if (options.trigger) {
            return history.loadUrl(fragment);
        }
    };

    /**
     * Navigates back in the browser history.
     * @method navigateBack
     */
    history.navigateBack = function() {
        history.history.back();
    };

    /**
     * @class HistoryOptions
     * @static
     */

    /**
     * The function that will be called back when the fragment changes.
     * @property {function} routeHandler
     */

    /**
     * The url root used to extract the fragment when using push state.
     * @property {string} root
     */

    /**
     * Use hash change when present.
     * @property {boolean} hashChange
     * @default true
     */

    /**
     * Use push state when present.
     * @property {boolean} pushState
     * @default false
     */

    /**
     * Prevents loading of the current url when activating history.
     * @property {boolean} silent
     * @default false
     */

    return history;
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Connects the history module's url and history tracking support to Durandal's activation and composition engine allowing you to easily build navigation-style applications.
 * @module router
 * @requires system
 * @requires app
 * @requires activator
 * @requires events
 * @requires composition
 * @requires history
 * @requires knockout
 * @requires jquery
 */
define('plugins/router',['durandal/system', 'durandal/app', 'durandal/activator', 'durandal/events', 'durandal/composition', 'plugins/history', 'knockout', 'jquery'], function(system, app, activator, events, composition, history, ko, $) {
    var optionalParam = /\((.*?)\)/g;
    var namedParam = /(\(\?)?:\w+/g;
    var splatParam = /\*\w+/g;
    var escapeRegExp = /[\-{}\[\]+?.,\\\^$|#\s]/g;
    var startDeferred, rootRouter;
    var trailingSlash = /\/$/;

    function routeStringToRegExp(routeString) {
        routeString = routeString.replace(escapeRegExp, '\\$&')
            .replace(optionalParam, '(?:$1)?')
            .replace(namedParam, function(match, optional) {
                return optional ? match : '([^\/]+)';
            })
            .replace(splatParam, '(.*?)');

        return new RegExp('^' + routeString + '$');
    }

    function stripParametersFromRoute(route) {
        var colonIndex = route.indexOf(':');
        var length = colonIndex > 0 ? colonIndex - 1 : route.length;
        return route.substring(0, length);
    }

    function endsWith(str, suffix) {
        return str.indexOf(suffix, str.length - suffix.length) !== -1;
    }

    function compareArrays(first, second) {
        if (!first || !second){
            return false;
        }

        if (first.length != second.length) {
            return false;
        }

        for (var i = 0, len = first.length; i < len; i++) {
            if (first[i] != second[i]) {
                return false;
            }
        }

        return true;
    }

    /**
     * @class Router
     * @uses Events
     */

    /**
     * Triggered when the navigation logic has completed.
     * @event router:navigation:complete
     * @param {object} instance The activated instance.
     * @param {object} instruction The routing instruction.
     * @param {Router} router The router.
     */

    /**
     * Triggered when the navigation has been cancelled.
     * @event router:navigation:cancelled
     * @param {object} instance The activated instance.
     * @param {object} instruction The routing instruction.
     * @param {Router} router The router.
     */

    /**
     * Triggered right before a route is activated.
     * @event router:route:activating
     * @param {object} instance The activated instance.
     * @param {object} instruction The routing instruction.
     * @param {Router} router The router.
     */

    /**
     * Triggered right before a route is configured.
     * @event router:route:before-config
     * @param {object} config The route config.
     * @param {Router} router The router.
     */

    /**
     * Triggered just after a route is configured.
     * @event router:route:after-config
     * @param {object} config The route config.
     * @param {Router} router The router.
     */

    /**
     * Triggered when the view for the activated instance is attached.
     * @event router:navigation:attached
     * @param {object} instance The activated instance.
     * @param {object} instruction The routing instruction.
     * @param {Router} router The router.
     */

    /**
     * Triggered when the composition that the activated instance participates in is complete.
     * @event router:navigation:composition-complete
     * @param {object} instance The activated instance.
     * @param {object} instruction The routing instruction.
     * @param {Router} router The router.
     */

    /**
     * Triggered when the router does not find a matching route.
     * @event router:route:not-found
     * @param {string} fragment The url fragment.
     * @param {Router} router The router.
     */

    var createRouter = function() {
        var queue = [],
            isProcessing = ko.observable(false),
            currentActivation,
            currentInstruction,
            activeItem = activator.create();

        var router = {
            /**
             * The route handlers that are registered. Each handler consists of a `routePattern` and a `callback`.
             * @property {object[]} handlers
             */
            handlers: [],
            /**
             * The route configs that are registered.
             * @property {object[]} routes
             */
            routes: [],
            /**
             * The route configurations that have been designated as displayable in a nav ui (nav:true).
             * @property {KnockoutObservableArray} navigationModel
             */
            navigationModel: ko.observableArray([]),
            /**
             * The active item/screen based on the current navigation state.
             * @property {Activator} activeItem
             */
            activeItem: activeItem,
            /**
             * Indicates that the router (or a child router) is currently in the process of navigating.
             * @property {KnockoutComputed} isNavigating
             */
            isNavigating: ko.computed(function() {
                var current = activeItem();
                var processing = isProcessing();
                var currentRouterIsProcesing = current
                    && current.router
                    && current.router != router
                    && current.router.isNavigating() ? true : false;
                return  processing || currentRouterIsProcesing;
            }),
            /**
             * An observable surfacing the active routing instruction that is currently being processed or has recently finished processing.
             * The instruction object has `config`, `fragment`, `queryString`, `params` and `queryParams` properties.
             * @property {KnockoutObservable} activeInstruction
             */
            activeInstruction:ko.observable(null),
            __router__:true
        };

        events.includeIn(router);

        activeItem.settings.areSameItem = function (currentItem, newItem, currentActivationData, newActivationData) {
            if (currentItem == newItem) {
                return compareArrays(currentActivationData, newActivationData);
            }

            return false;
        };

        function hasChildRouter(instance) {
            return instance.router && instance.router.parent == router;
        }

        function setCurrentInstructionRouteIsActive(flag) {
            if (currentInstruction && currentInstruction.config.isActive) {
                currentInstruction.config.isActive(flag)
            }
        }

        function completeNavigation(instance, instruction) {
            system.log('Navigation Complete', instance, instruction);

            var fromModuleId = system.getModuleId(currentActivation);
            if (fromModuleId) {
                router.trigger('router:navigation:from:' + fromModuleId);
            }

            currentActivation = instance;

            setCurrentInstructionRouteIsActive(false);
            currentInstruction = instruction;
            setCurrentInstructionRouteIsActive(true);

            var toModuleId = system.getModuleId(currentActivation);
            if (toModuleId) {
                router.trigger('router:navigation:to:' + toModuleId);
            }

            if (!hasChildRouter(instance)) {
                router.updateDocumentTitle(instance, instruction);
            }

            rootRouter.explicitNavigation = false;
            rootRouter.navigatingBack = false;
            router.trigger('router:navigation:complete', instance, instruction, router);
        }

        function cancelNavigation(instance, instruction) {
            system.log('Navigation Cancelled');

            router.activeInstruction(currentInstruction);

            if (currentInstruction) {
                router.navigate(currentInstruction.fragment, false);
            }

            isProcessing(false);
            rootRouter.explicitNavigation = false;
            rootRouter.navigatingBack = false;
            router.trigger('router:navigation:cancelled', instance, instruction, router);
        }

        function redirect(url) {
            system.log('Navigation Redirecting');

            isProcessing(false);
            rootRouter.explicitNavigation = false;
            rootRouter.navigatingBack = false;
            router.navigate(url, { trigger: true, replace: true });
        }

        function activateRoute(activator, instance, instruction) {
            rootRouter.navigatingBack = !rootRouter.explicitNavigation && currentActivation != instruction.fragment;
            router.trigger('router:route:activating', instance, instruction, router);

            activator.activateItem(instance, instruction.params).then(function(succeeded) {
                if (succeeded) {
                    var previousActivation = currentActivation;
                    completeNavigation(instance, instruction);

                    if (hasChildRouter(instance)) {
                        var fullFragment = instruction.fragment;
                        if (instruction.queryString) {
                            fullFragment += "?" + instruction.queryString;
                        }

                        instance.router.loadUrl(fullFragment);
                    }

                    if (previousActivation == instance) {
                        router.attached();
                        router.compositionComplete();
                    }
                } else if(activator.settings.lifecycleData && activator.settings.lifecycleData.redirect){
                    redirect(activator.settings.lifecycleData.redirect);
                }else{
                    cancelNavigation(instance, instruction);
                }

                if (startDeferred) {
                    startDeferred.resolve();
                    startDeferred = null;
                }
            }).fail(function(err){
                system.error(err);
            });;
        }

        /**
         * Inspects routes and modules before activation. Can be used to protect access by cancelling navigation or redirecting.
         * @method guardRoute
         * @param {object} instance The module instance that is about to be activated by the router.
         * @param {object} instruction The route instruction. The instruction object has config, fragment, queryString, params and queryParams properties.
         * @return {Promise|Boolean|String} If a boolean, determines whether or not the route should activate or be cancelled. If a string, causes a redirect to the specified route. Can also be a promise for either of these value types.
         */
        function handleGuardedRoute(activator, instance, instruction) {
            var resultOrPromise = router.guardRoute(instance, instruction);
            if (resultOrPromise) {
                if (resultOrPromise.then) {
                    resultOrPromise.then(function(result) {
                        if (result) {
                            if (system.isString(result)) {
                                redirect(result);
                            } else {
                                activateRoute(activator, instance, instruction);
                            }
                        } else {
                            cancelNavigation(instance, instruction);
                        }
                    });
                } else {
                    if (system.isString(resultOrPromise)) {
                        redirect(resultOrPromise);
                    } else {
                        activateRoute(activator, instance, instruction);
                    }
                }
            } else {
                cancelNavigation(instance, instruction);
            }
        }

        function ensureActivation(activator, instance, instruction) {
            if (router.guardRoute) {
                handleGuardedRoute(activator, instance, instruction);
            } else {
                activateRoute(activator, instance, instruction);
            }
        }

        function canReuseCurrentActivation(instruction) {
            return currentInstruction
                && currentInstruction.config.moduleId == instruction.config.moduleId
                && currentActivation
                && ((currentActivation.canReuseForRoute && currentActivation.canReuseForRoute.apply(currentActivation, instruction.params))
                || (!currentActivation.canReuseForRoute && currentActivation.router && currentActivation.router.loadUrl));
        }

        function dequeueInstruction() {
            if (isProcessing()) {
                return;
            }

            var instruction = queue.shift();
            queue = [];

            if (!instruction) {
                return;
            }

            isProcessing(true);
            router.activeInstruction(instruction);

            if (canReuseCurrentActivation(instruction)) {
                ensureActivation(activator.create(), currentActivation, instruction);
            } else {
                system.acquire(instruction.config.moduleId).then(function(module) {
                    var instance = system.resolveObject(module);
                    ensureActivation(activeItem, instance, instruction);
                }).fail(function(err){
                        system.error('Failed to load routed module (' + instruction.config.moduleId + '). Details: ' + err.message);
                    });
            }
        }

        function queueInstruction(instruction) {
            queue.unshift(instruction);
            dequeueInstruction();
        }

        // Given a route, and a URL fragment that it matches, return the array of
        // extracted decoded parameters. Empty or unmatched parameters will be
        // treated as `null` to normalize cross-browser behavior.
        function createParams(routePattern, fragment, queryString) {
            var params = routePattern.exec(fragment).slice(1);

            for (var i = 0; i < params.length; i++) {
                var current = params[i];
                params[i] = current ? decodeURIComponent(current) : null;
            }

            var queryParams = router.parseQueryString(queryString);
            if (queryParams) {
                params.push(queryParams);
            }

            return {
                params:params,
                queryParams:queryParams
            };
        }

        function configureRoute(config){
            router.trigger('router:route:before-config', config, router);

            if (!system.isRegExp(config)) {
                config.title = config.title || router.convertRouteToTitle(config.route);
                config.moduleId = config.moduleId || router.convertRouteToModuleId(config.route);
                config.hash = config.hash || router.convertRouteToHash(config.route);
                config.routePattern = routeStringToRegExp(config.route);
            }else{
                config.routePattern = config.route;
            }

            config.isActive = config.isActive || ko.observable(false);
            router.trigger('router:route:after-config', config, router);
            router.routes.push(config);

            router.route(config.routePattern, function(fragment, queryString) {
                var paramInfo = createParams(config.routePattern, fragment, queryString);
                queueInstruction({
                    fragment: fragment,
                    queryString:queryString,
                    config: config,
                    params: paramInfo.params,
                    queryParams:paramInfo.queryParams
                });
            });
        };

        function mapRoute(config) {
            if(system.isArray(config.route)){
                var isActive = config.isActive || ko.observable(false);

                for(var i = 0, length = config.route.length; i < length; i++){
                    var current = system.extend({}, config);

                    current.route = config.route[i];
                    current.isActive = isActive;

                    if(i > 0){
                        delete current.nav;
                    }

                    configureRoute(current);
                }
            }else{
                configureRoute(config);
            }

            return router;
        }

        /**
         * Parses a query string into an object.
         * @method parseQueryString
         * @param {string} queryString The query string to parse.
         * @return {object} An object keyed according to the query string parameters.
         */
        router.parseQueryString = function (queryString) {
            var queryObject, pairs;

            if (!queryString) {
                return null;
            }

            pairs = queryString.split('&');

            if (pairs.length == 0) {
                return null;
            }

            queryObject = {};

            for (var i = 0; i < pairs.length; i++) {
                var pair = pairs[i];
                if (pair === '') {
                    continue;
                }

                var parts = pair.split('=');
                queryObject[parts[0]] = parts[1] && decodeURIComponent(parts[1].replace(/\+/g, ' '));
            }

            return queryObject;
        };

        /**
         * Add a route to be tested when the url fragment changes.
         * @method route
         * @param {RegEx} routePattern The route pattern to test against.
         * @param {function} callback The callback to execute when the route pattern is matched.
         */
        router.route = function(routePattern, callback) {
            router.handlers.push({ routePattern: routePattern, callback: callback });
        };

        /**
         * Attempt to load the specified URL fragment. If a route succeeds with a match, returns `true`. If no defined routes matches the fragment, returns `false`.
         * @method loadUrl
         * @param {string} fragment The URL fragment to find a match for.
         * @return {boolean} True if a match was found, false otherwise.
         */
        router.loadUrl = function(fragment) {
            var handlers = router.handlers,
                queryString = null,
                coreFragment = fragment,
                queryIndex = fragment.indexOf('?');

            if (queryIndex != -1) {
                coreFragment = fragment.substring(0, queryIndex);
                queryString = fragment.substr(queryIndex + 1);
            }

            if(router.relativeToParentRouter){
                var instruction = this.parent.activeInstruction();
                coreFragment = instruction.params.join('/');

                if(coreFragment && coreFragment.charAt(0) == '/'){
                    coreFragment = coreFragment.substr(1);
                }

                if(!coreFragment){
                    coreFragment = '';
                }

                coreFragment = coreFragment.replace('//', '/').replace('//', '/');
            }

            coreFragment = coreFragment.replace(trailingSlash, '');

            for (var i = 0; i < handlers.length; i++) {
                var current = handlers[i];
                if (current.routePattern.test(coreFragment)) {
                    current.callback(coreFragment, queryString);
                    return true;
                }
            }

            system.log('Route Not Found');
            router.trigger('router:route:not-found', fragment, router);

            if (currentInstruction) {
                history.navigate(currentInstruction.fragment, { trigger:false, replace:true });
            }

            rootRouter.explicitNavigation = false;
            rootRouter.navigatingBack = false;

            return false;
        };

        /**
         * Updates the document title based on the activated module instance, the routing instruction and the app.title.
         * @method updateDocumentTitle
         * @param {object} instance The activated module.
         * @param {object} instruction The routing instruction associated with the action. It has a `config` property that references the original route mapping config.
         */
        router.updateDocumentTitle = function(instance, instruction) {
            if (instruction.config.title) {
                if (app.title) {
                    document.title = instruction.config.title + " | " + app.title;
                } else {
                    document.title = instruction.config.title;
                }
            } else if (app.title) {
                document.title = app.title;
            }
        };

        /**
         * Save a fragment into the hash history, or replace the URL state if the
         * 'replace' option is passed. You are responsible for properly URL-encoding
         * the fragment in advance.
         * The options object can contain `trigger: false` if you wish to not have the
         * route callback be fired, or `replace: true`, if
         * you wish to modify the current URL without adding an entry to the history.
         * @method navigate
         * @param {string} fragment The url fragment to navigate to.
         * @param {object|boolean} options An options object with optional trigger and replace flags. You can also pass a boolean directly to set the trigger option. Trigger is `true` by default.
         * @return {boolean} Returns true/false from loading the url.
         */
        router.navigate = function(fragment, options) {
            if(fragment && fragment.indexOf('://') != -1){
                window.location.href = fragment;
                return true;
            }

            rootRouter.explicitNavigation = true;
            return history.navigate(fragment, options);
        };

        /**
         * Navigates back in the browser history.
         * @method navigateBack
         */
        router.navigateBack = function() {
            history.navigateBack();
        };

        router.attached = function() {
            router.trigger('router:navigation:attached', currentActivation, currentInstruction, router);
        };

        router.compositionComplete = function(){
            isProcessing(false);
            router.trigger('router:navigation:composition-complete', currentActivation, currentInstruction, router);
            dequeueInstruction();
        };

        /**
         * Converts a route to a hash suitable for binding to a link's href.
         * @method convertRouteToHash
         * @param {string} route
         * @return {string} The hash.
         */
        router.convertRouteToHash = function(route) {
            if(router.relativeToParentRouter){
                var instruction = router.parent.activeInstruction(),
                    hash = instruction.config.hash + '/' + route;

                if(history._hasPushState){
                    hash = '/' + hash;
                }

                hash = hash.replace('//', '/').replace('//', '/');
                return hash;
            }

            if(history._hasPushState){
                return route;
            }

            return "#" + route;
        };

        /**
         * Converts a route to a module id. This is only called if no module id is supplied as part of the route mapping.
         * @method convertRouteToModuleId
         * @param {string} route
         * @return {string} The module id.
         */
        router.convertRouteToModuleId = function(route) {
            return stripParametersFromRoute(route);
        };

        /**
         * Converts a route to a displayable title. This is only called if no title is specified as part of the route mapping.
         * @method convertRouteToTitle
         * @param {string} route
         * @return {string} The title.
         */
        router.convertRouteToTitle = function(route) {
            var value = stripParametersFromRoute(route);
            return value.substring(0, 1).toUpperCase() + value.substring(1);
        };

        /**
         * Maps route patterns to modules.
         * @method map
         * @param {string|object|object[]} route A route, config or array of configs.
         * @param {object} [config] The config for the specified route.
         * @chainable
         * @example
 router.map([
    { route: '', title:'Home', moduleId: 'homeScreen', nav: true },
    { route: 'customer/:id', moduleId: 'customerDetails'}
 ]);
         */
        router.map = function(route, config) {
            if (system.isArray(route)) {
                for (var i = 0; i < route.length; i++) {
                    router.map(route[i]);
                }

                return router;
            }

            if (system.isString(route) || system.isRegExp(route)) {
                if (!config) {
                    config = {};
                } else if (system.isString(config)) {
                    config = { moduleId: config };
                }

                config.route = route;
            } else {
                config = route;
            }

            return mapRoute(config);
        };

        /**
         * Builds an observable array designed to bind a navigation UI to. The model will exist in the `navigationModel` property.
         * @method buildNavigationModel
         * @param {number} defaultOrder The default order to use for navigation visible routes that don't specify an order. The default is 100 and each successive route will be one more than that.
         * @chainable
         */
        router.buildNavigationModel = function(defaultOrder) {
            var nav = [], routes = router.routes;
            var fallbackOrder = defaultOrder || 100;

            for (var i = 0; i < routes.length; i++) {
                var current = routes[i];

                if (current.nav) {
                    if (!system.isNumber(current.nav)) {
                        current.nav = ++fallbackOrder;
                    }

                    nav.push(current);
                }
            }

            nav.sort(function(a, b) { return a.nav - b.nav; });
            router.navigationModel(nav);

            return router;
        };

        /**
         * Configures how the router will handle unknown routes.
         * @method mapUnknownRoutes
         * @param {string|function} [config] If not supplied, then the router will map routes to modules with the same name.
         * If a string is supplied, it represents the module id to route all unknown routes to.
         * Finally, if config is a function, it will be called back with the route instruction containing the route info. The function
         * can then modify the instruction by adding a moduleId and the router will take over from there.
         * @param {string} [replaceRoute] If config is a module id, then you can optionally provide a route to replace the url with.
         * @chainable
         */
        router.mapUnknownRoutes = function(config, replaceRoute) {
            var catchAllRoute = "*catchall";
            var catchAllPattern = routeStringToRegExp(catchAllRoute);

            router.route(catchAllPattern, function (fragment, queryString) {
                var paramInfo = createParams(catchAllPattern, fragment, queryString);
                var instruction = {
                    fragment: fragment,
                    queryString: queryString,
                    config: {
                        route: catchAllRoute,
                        routePattern: catchAllPattern
                    },
                    params: paramInfo.params,
                    queryParams: paramInfo.queryParams
                };

                if (!config) {
                    instruction.config.moduleId = fragment;
                } else if (system.isString(config)) {
                    instruction.config.moduleId = config;
                    if(replaceRoute){
                        history.navigate(replaceRoute, { trigger:false, replace:true });
                    }
                } else if (system.isFunction(config)) {
                    var result = config(instruction);
                    if (result && result.then) {
                        result.then(function() {
                            router.trigger('router:route:before-config', instruction.config, router);
                            router.trigger('router:route:after-config', instruction.config, router);
                            queueInstruction(instruction);
                        });
                        return;
                    }
                } else {
                    instruction.config = config;
                    instruction.config.route = catchAllRoute;
                    instruction.config.routePattern = catchAllPattern;
                }

                router.trigger('router:route:before-config', instruction.config, router);
                router.trigger('router:route:after-config', instruction.config, router);
                queueInstruction(instruction);
            });

            return router;
        };

        /**
         * Resets the router by removing handlers, routes, event handlers and previously configured options.
         * @method reset
         * @chainable
         */
        router.reset = function() {
            currentInstruction = currentActivation = undefined;
            router.handlers = [];
            router.routes = [];
            router.off();
            delete router.options;
            return router;
        };

        /**
         * Makes all configured routes and/or module ids relative to a certain base url.
         * @method makeRelative
         * @param {string|object} settings If string, the value is used as the base for routes and module ids. If an object, you can specify `route` and `moduleId` separately. In place of specifying route, you can set `fromParent:true` to make routes automatically relative to the parent router's active route.
         * @chainable
         */
        router.makeRelative = function(settings){
            if(system.isString(settings)){
                settings = {
                    moduleId:settings,
                    route:settings
                };
            }

            if(settings.moduleId && !endsWith(settings.moduleId, '/')){
                settings.moduleId += '/';
            }

            if(settings.route && !endsWith(settings.route, '/')){
                settings.route += '/';
            }

            if(settings.fromParent){
                router.relativeToParentRouter = true;
            }

            router.on('router:route:before-config').then(function(config){
                if(settings.moduleId){
                    config.moduleId = settings.moduleId + config.moduleId;
                }

                if(settings.route){
                    if(config.route === ''){
                        config.route = settings.route.substring(0, settings.route.length - 1);
                    }else{
                        config.route = settings.route + config.route;
                    }
                }
            });

            return router;
        };

        /**
         * Creates a child router.
         * @method createChildRouter
         * @return {Router} The child router.
         */
        router.createChildRouter = function() {
            var childRouter = createRouter();
            childRouter.parent = router;
            return childRouter;
        };

        return router;
    };

    /**
     * @class RouterModule
     * @extends Router
     * @static
     */
    rootRouter = createRouter();
    rootRouter.explicitNavigation = false;
    rootRouter.navigatingBack = false;

    /**
     * Verify that the target is the current window
     * @method targetIsThisWindow
     * @return {boolean} True if the event's target is the current window, false otherwise.
     */
    rootRouter.targetIsThisWindow = function(event) {
        var targetWindow = $(event.target).attr('target');
        
        if (!targetWindow ||
            targetWindow === window.name ||
            targetWindow === '_self' ||
            (targetWindow === 'top' && window === window.top)) { return true; }
        
        return false;
    };

    /**
     * Activates the router and the underlying history tracking mechanism.
     * @method activate
     * @return {Promise} A promise that resolves when the router is ready.
     */
    rootRouter.activate = function(options) {
        return system.defer(function(dfd) {
            startDeferred = dfd;
            rootRouter.options = system.extend({ routeHandler: rootRouter.loadUrl }, rootRouter.options, options);

            history.activate(rootRouter.options);

            if(history._hasPushState){
                var routes = rootRouter.routes,
                    i = routes.length;

                while(i--){
                    var current = routes[i];
                    current.hash = current.hash.replace('#', '');
                }
            }

            $(document).delegate("a", 'click', function(evt){
                if(history._hasPushState){
                    if(!evt.altKey && !evt.ctrlKey && !evt.metaKey && !evt.shiftKey && rootRouter.targetIsThisWindow(evt)){
                        var href = $(this).attr("href");

                        // Ensure the protocol is not part of URL, meaning its relative.
                        // Stop the event bubbling to ensure the link will not cause a page refresh.
                        if (href != null && !(href.charAt(0) === "#" || /^[a-z]+:/i.test(href))) {
                            rootRouter.explicitNavigation = true;
                            evt.preventDefault();
                            history.navigate(href);
                        }
                    }
                }else{
                    rootRouter.explicitNavigation = true;
                }
            });

            if(history.options.silent && startDeferred){
                startDeferred.resolve();
                startDeferred = null;
            }
        }).promise();
    };

    /**
     * Disable history, perhaps temporarily. Not useful in a real app, but possibly useful for unit testing Routers.
     * @method deactivate
     */
    rootRouter.deactivate = function() {
        history.deactivate();
    };

    /**
     * Installs the router's custom ko binding handler.
     * @method install
     */
    rootRouter.install = function(){
        ko.bindingHandlers.router = {
            init: function() {
                return { controlsDescendantBindings: true };
            },
            update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                var settings = ko.utils.unwrapObservable(valueAccessor()) || {};

                if (settings.__router__) {
                    settings = {
                        model:settings.activeItem(),
                        attached:settings.attached,
                        compositionComplete:settings.compositionComplete,
                        activate: false
                    };
                } else {
                    var theRouter = ko.utils.unwrapObservable(settings.router || viewModel.router) || rootRouter;
                    settings.model = theRouter.activeItem();
                    settings.attached = theRouter.attached;
                    settings.compositionComplete = theRouter.compositionComplete;
                    settings.activate = false;
                }

                composition.compose(element, settings, bindingContext);
            }
        };

        ko.virtualElements.allowedBindings.router = true;
    };

    return rootRouter;
});

requirejs.config({
    paths: {
        'text': '../Scripts/text',
        'durandal': '../Scripts/durandal',
        'plugins': '../Scripts/durandal/plugins',
        'transitions': '../Scripts/durandal/transitions'
    }
});

define('jquery', [],function () { return jQuery; });
define('knockout', ko);

define('main',['durandal/system', 'durandal/app', 'durandal/viewLocator', 'services/logger',
    'plugins/router'],
    function (system, app, viewLocator, logger, router) {
        
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

            // TODO: Add "route not found" indicator.
        });
    });
define('viewmodels/areas/browse',['services/logger', 'plugins/router', 'datacontexts/area.datacontext'],
    function (logger, router, datacontext) {

        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'AREAS',
            activate: activate,
            attached: attached,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            items: ko.observableArray([]),
            noItemsToShow: ko.observable(true),
            removeItems: ko.observable(false),
            //#endregion

            //#region Methods.
            toggleRemoveItems: toggleRemoveItems,
            selectItem: selectItem,
            //#endregion
        };

        return vm;

        //#region Internal methods.
        function activate() {
            logger.log('Browse areas view activated', null, 'areas/browse', false);
            return true;
        }

        function attached() {
            getItems('get');
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.removeItems(false);
            return true;
        }

        function getItems(action) {
            return datacontext.getItems(
                vm.items,
                vm.error,
                action,
                null,
                [updateNoItemsToShowProperty]);
        }

        function updateNoItemsToShowProperty() {
            if (vm.items().length === 0) {
                return vm.noItemsToShow(true);
            }
            return vm.noItemsToShow(false);
        }

        function toggleRemoveItems() {
            return vm.removeItems(!vm.removeItems());
        }

        function selectItem(item) {
            if (vm.removeItems()) {
                if (confirm('Are you sure you want to delete this item?')) {
                    return deleteItem(item);
                }
            } else {
                return router.navigate('#/areas/edit/' + item.Id);
            }
        }

        function deleteItem(item) {
            return datacontext.deleteItem(item,
                [removeDeletedItemsFromView, updateNoItemsToShowProperty]);
        }

        function removeDeletedItemsFromView(item) {
            return vm.items.remove(item);
        }
        //#endregion
    });
define('viewmodels/areas/create',['services/logger', 'plugins/router', 'datacontexts/area.datacontext',
    'viewmodels/areas/browse'],
    function (logger, router, datacontext, browseVM) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'NEW AREA',
            activate: activate,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            item: ko.observable(),
            //#endregion

            //#region Methods.
            saveItem: saveItem,
            //#endregion
        };

        return vm;

        //#region Internal methods.
        function activate() {
            logger.log('Create area view activated', null, 'areas/create', false);
            vm.item(datacontext.createItem({}));
            vm.errors = ko.validation.group(vm.item());
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.item(undefined);
            return true;
        }

        // TODO: Client-side validation
        function saveItem(item) {
            if (vm.errors().length === 0) {
                datacontext.saveNewItem(
                item,
                [
                    addNewItemToBrowseVM,
                    navigateToBrowseView,
                    clearItems
                ]);
            } else {
                vm.errors.showAllMessages();
            }
        }

        function addNewItemToBrowseVM(newItem) {
            browseVM.items.push(newItem);
        }

        function navigateToBrowseView(changedItem) {
            router.navigate('#/areas/browse');
        }

        function clearItems() {
            vm.item(undefined);
        }
        //#endregion
    });
define('viewmodels/areas/edit',['services/logger', 'plugins/router', 'datacontexts/area.datacontext',
    'viewmodels/areas/browse'],
    function (logger, router, datacontext, browseVM) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'EDIT AREA',
            activate: activate,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            item: ko.observable(),
            //#endregion

            //#region Methods.
            saveItem: saveItem,
            //#endregion
        };

        // Initialize validation group once vm.item is set
        vm.item.subscribe(function (newValue) {
            if (newValue !== undefined) {
                vm.errors = ko.validation.group(newValue);
            }
        });

        return vm;

        //#region Internal methods.
        function activate(id) {
            logger.log('Edit area view activated', null, 'areas/edit', false);
            getArea(id);
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.item(undefined);
            return true;
        }

        function getArea(id) {
            // Try to get item from the BrowseVM, if initialized.
            ko.utils.arrayFirst(browseVM.items(), function (item) {
                if (item.Id === id) {
                    return vm.item(item);
                }
            });

            // If item wasn't retrieved from BrowseVM, retrieve from DB.
            if (undefined === vm.item()) {
                return datacontext.getItem(id, vm.item, vm.error);
            }
        }

        // TODO: Client-side validation
        function saveItem(item) {
            if (vm.errors().length === 0) {
                datacontext.saveChangedItem(
                item,
                [updateChangedItemInBrowseVM, navigateToBrowseView]);
            } else {
                vm.errors.showAllMessages();
            }
        }

        function updateChangedItemInBrowseVM(changedItem) {
            browseVM.items.remove(function (item) {
                return item.Id === changedItem.Id;
            });
            browseVM.items.push(changedItem);
        }

        function navigateToBrowseView(newItem) {
            router.navigate('#/areas/browse');
        }

        //#endregion
    });
define('viewmodels/funds/browse',['services/logger', 'plugins/router', 'datacontexts/fund.datacontext',
    'datacontexts/area.datacontext'],
    function (logger, router, datacontext, areaDatacontext) {

        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'FUNDS',
            activate: activate,
            attached: attached,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            areas: ko.observableArray([]),
            selectedAreaId: ko.observable(),
            items: ko.observableArray([]),
            noItemsToShow: ko.observable(true),
            //#endregion

            //#region Methods.
            navigateToCreateView: navigateToCreateView,
            updateNoItemsToShowProperty: updateNoItemsToShowProperty,
            //#endregion
        };

        vm.selectedAreaId.subscribe(function (newValue) {
            getItems('getbyarea');
        });

        return vm;

        //#region Internal methods.
        function activate() {
            logger.log('Browse funds view activated', null, 'funds/browse', false);
            return true;
        }

        function attached() {
            getAreas('get');
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            return true;
        }

        function getAreas(action) {
            return areaDatacontext.getItems(
                vm.areas,
                vm.error,
                action,
                null,
                [initSelectedArea]);
        }

        function initSelectedArea(areas) {
            vm.selectedAreaId(areas[0].Id);
        }

        function getItems(action) {
            return datacontext.getItems(
                vm.items,
                vm.error,
                action,
                {
                    areaId: vm.selectedAreaId(),
                },
                [updateNoItemsToShowProperty]);
        }

        function updateNoItemsToShowProperty() {
            if (vm.items().length === 0) {
                return vm.noItemsToShow(true);
            }
            return vm.noItemsToShow(false);
        }

        function navigateToCreateView() {
            return router.navigate('#/funds/create?areaid=' + vm.selectedAreaId());
        }
        //#endregion
    });
define('viewmodels/funds/create',['services/logger', 'plugins/router', 'datacontexts/fund.datacontext',
    'datacontexts/fileupload.datacontext', 'viewmodels/funds/browse'],
    function (logger, router, datacontext, fileuploadDatacontext, browseVM) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'NEW FUND',
            activate: activate,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            item: ko.observable(),
            //#endregion

            //#region Methods.
            postFiles: postFiles,
            removeFileUpload: removeFileUpload,
            saveItem: saveItem,
            //#endregion
        };

        return vm;

        //#region Internal methods.
        function activate(queryString) {
            logger.log('Create fund view activated', null, 'funds/create', false);

            vm.item(datacontext.createItem({
                Number: 'temporary',
                AreaId: queryString.areaid
            }));

            vm.errors = ko.validation.group(vm.item());
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.item(undefined);
            return true;
        }

        function postFiles(data, evt) {
            fileuploadDatacontext.saveNewItem(data, evt, vm.item().FileUploads, vm.error);
        }

        function removeFileUpload(item) {
            if (confirm('Are you sure you want to delete this item?')) {
                var indexOfUpload = vm.item().FileUploads.indexOf(item);

                // Mark upload item for removal when parent item is saved.
                vm.item().FileUploads()[indexOfUpload].destroy(true);
            }
        }

        // TODO: Client-side validation.
        function saveItem(item) {
            if (vm.errors().length === 0) {
                // Remove uploads with errors.
                var uploadItemsWithErrors = item.FileUploads.remove(function (uploadItem) {
                    return uploadItem.errorMessage();
                });

                // Remove uploads marked with destroy.
                var removedUploadItems = item.FileUploads.remove(function (uploadItem) {
                    return uploadItem.destroy();
                });

                // Delete removed files from server.
                $.each(removedUploadItems, function (index, value) {
                    fileuploadDatacontext.deleteItem(value);
                });

                datacontext.saveNewItem(
                    item,
                    [addNewItemToBrowseVM, navigateToBrowseView]);
            } else {
                vm.errors.showAllMessages();
            }
        }

        function addNewItemToBrowseVM(newItem) {
            browseVM.items.push(datacontext.createItem(newItem));
            browseVM.updateNoItemsToShowProperty();
        }

        function navigateToBrowseView(newItem) {
            router.navigate('#/funds/browse');
        }

        //#endregion
    });
define('viewmodels/funds/edit',['services/logger', 'plugins/router', 'datacontexts/fund.datacontext',
    'datacontexts/fileupload.datacontext', 'viewmodels/funds/browse'],
    function (logger, router, datacontext, fileuploadDatacontext, browseVM) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'EDIT FUND',
            activate: activate,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            item: ko.observable(),
            //#endregion

            //#region Methods.
            postFiles: postFiles,
            saveItem: saveItem,
            removeFileUpload: removeFileUpload,
            //#endregion
        };

        vm.item.subscribe(function (newValue) {
            if (newValue !== undefined) {
                vm.errors = ko.validation.group(newValue);
            }
        });

        return vm;

        //#region Internal methods.
        function activate(id) {
            logger.log('Edit fund view activated', null, 'funds/edit', false);
            getFund(id);
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            vm.item(undefined);
            return true;
        }

        function getFund(id) {
            // Try to get item from the BrowseVM, if initialized.
            ko.utils.arrayFirst(browseVM.items(), function (item) {
                if (item.Id === id) {
                    return vm.item(item);
                }
            });

            // If item wasn't retrieved from BrowseVM, retrieve from DB.
            if (undefined === vm.item()) {
                return datacontext.getItem(id, vm.item, vm.error);
            }
        }

        function postFiles(data, evt) {
            fileuploadDatacontext.saveNewItem(data, evt, vm.item().FileUploads, vm.error);
        }

        function removeFileUpload(item) {
            if (confirm('Are you sure you want to delete this item?')) {
                var indexOfUpload = vm.item().FileUploads.indexOf(item);

                // Mark upload item for removal when parent item is saved.
                vm.item().FileUploads()[indexOfUpload].destroy(true);
            }
        }

        // TODO: Client-side validation
        function saveItem(item) {
            if (vm.errors().length === 0) {
                // Remove uploads with errors.
                var uploadItemsWithErrors = item.FileUploads.remove(function (uploadItem) {
                    return uploadItem.errorMessage();
                });

                // Remove uploads marked with destroy.
                var removedUploadItems = item.FileUploads.remove(function (uploadItem) {
                    return uploadItem.destroy();
                });

                // Delete removed files from server.
                $.each(removedUploadItems, function (index, value) {
                    fileuploadDatacontext.deleteItem(value);
                });

                datacontext.saveChangedItem(
                    item,
                    [updateChangedItemInBrowseVM, navigateToBrowseView]);
            } else {
                vm.errors.showAllMessages();
            }
        }

        function updateChangedItemInBrowseVM(changedItem) {
            // Remove the changed item from the BrowseVM, if initialized.
            browseVM.items.remove(function (item) {
                return item.Id === changedItem.Id;
            });

            // Add the item back to the BrowseVM reflecting the changes.
            browseVM.items.push(datacontext.createItem(changedItem));

            browseVM.updateNoItemsToShowProperty();
        }

        function navigateToBrowseView(newItem) {
            router.navigate('#/funds/browse');
        }

        //#endregion
    });
define('viewmodels/reports/funding-request',['services/logger', 'plugins/router', 'datacontexts/area.datacontext',
    'datacontexts/fund.datacontext'],
    function (logger, router, areaDatacontext, fundDatacontext) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'FUNDING REQUEST REPORT',
            activate: activate,
            attached: attached,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            items: ko.observableArray(),
            oAreaFunds: ko.observableArray(),
            grandTotals: ko.observable(new GrandTotals()),
            //#endregion

            //#region Methods.
            //#endregion
        };

        return vm;

        //#region Internal methods.
        function activate() {
            logger.log('Funding request report view activated', null, 'reports/funding-request', false);
            getItems();
            return true;
        }

        function attached() {
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            return true;
        }

        function getItems() {
            return areaDatacontext.getItems(
                vm.items,
                vm.error,
                'get',
                null,
                [getFundDataForAreas]);
        }

        function getFundDataForAreas(areas) {
            $.each(vm.items(), function (index, value) {
                if (value.Number === 'O') {

                } else {
                    getFundsForArea(value);
                    getSubtotalsForArea(value);
                }
            });
            
        }

        function getFundsForArea(area) {
            return fundDatacontext.getItems(
                area.funds,
                vm.error,
                'getbyarea',
                {
                    areaId: area.Id
                },
                []);
        }

        function getSubtotalsForArea(area) {
            return fundDatacontext.getFundSubtotalsForArea(
                area.subtotals,
                vm.error,
                'getfundsubtotalsbyarea',
                {
                    areaId: area.Id
                },
                [getGrandTotals]);
        }

        function getGrandTotals(areaSubtotals) {
            // Don't add 'Other uses of funds' subtotals to grand total
            if (areaSubtotals.Id !== areaDatacontext.otherUsesOfFundsId()) {
                vm.grandTotals().currentBudget(vm.grandTotals().currentBudget() +
                    areaSubtotals.currentBudget());
                vm.grandTotals().projectedExpenditures(vm.grandTotals().projectedExpenditures() +
                    areaSubtotals.projectedExpenditures());
                vm.grandTotals().requestedBudget(vm.grandTotals().requestedBudget() +
                    (areaSubtotals.currentBudget() + areaSubtotals.budgetAdjustment()));
                vm.grandTotals().variance(vm.grandTotals().variance() +
                    (areaSubtotals.currentBudget() - areaSubtotals.requestedBudget()));
            }
        }

        function GrandTotals(data) {
            var self = this;
            data = data || {};

            self.currentBudget = ko.observable(0);
            self.projectedExpenditures = ko.observable(0);
            self.requestedBudget = ko.observable(0);
            self.variance = ko.observable(0);

            self.formattedCurrentBudget = ko.observable(data.currentBudget || 0)
                .extend({ currency: [0, self.CurrentBudget] });
            self.formattedProjectedExpenditures = ko.observable(data.projectedExpenditures || 0)
                .extend({ currency: [0, self.ProjectedExpenditures] });
            self.formattedRequestedBudget = ko.observable(self.requestedBudget())
                .extend({ currency: [0] });
            self.formattedVariance = ko.observable(self.variance())
                .extend({ currency: [0] });

            self.currentBudget.subscribe(function (newValue) {
                self.formattedCurrentBudget(newValue);
            });
            self.projectedExpenditures.subscribe(function (newValue) {
                self.formattedProjectedExpenditures(newValue);
            });
            self.requestedBudget.subscribe(function (newValue) {
                self.formattedRequestedBudget(newValue);
            });
            self.variance.subscribe(function (newValue) {
                self.formattedVariance(newValue);
            });
        }
        //#endregion
    });
define('viewmodels/reports/narrative',['services/logger', 'plugins/router', 'datacontexts/area.datacontext',
    'datacontexts/fund.datacontext'],
    function (logger, router, areaDatacontext, fundDatacontext) {
        var vm = {
            //#region Initialization.
            error: ko.observable(),
            title: 'NARRATIVE REPORT',
            activate: activate,
            attached: attached,
            deactivate: deactivate,
            //#endregion

            //#region Properties.
            items: ko.observableArray(),
            //#endregion

            //#region Methods.
            //#endregion
        };

        return vm;

        //#region Internal methods.
        function activate() {
            logger.log('Narrative information report view activated', null, 'reports/narrative-information', false);
            getItems();
            return true;
        }

        function attached() {
            return true;
        }

        function deactivate() {
            vm.error(undefined);
            return true;
        }

        function getItems() {
            return areaDatacontext.getItems(
                vm.items,
                vm.error,
                'get',
                null,
                [getFundDataForAreas]);
        }

        function getFundDataForAreas(areas) {
            $.each(vm.items(), function (index, value) {
                getFundsForArea(value);
            });

        }

        function getFundsForArea(area) {
            return fundDatacontext.getItems(
                area.funds,
                vm.error,
                'getbyarea',
                {
                    areaId: area.Id
                });
        }
        //#endregion
    });
define('viewmodels/shell',['plugins/router', 'durandal/app'],
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

define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
define('text!views/areas/browse.html',[],function () { return '<div class="row">\r\n    <div class="large-12 columns">\r\n        <h4 class="view-heading">AREAS</h4>\r\n\r\n        <div class="row">\r\n            <div class="large-12 columns">\r\n                <a data-bind="fastlink: \'/#/areas/create\'">Create a new area</a>\r\n            </div>\r\n        </div>\r\n\r\n        <div class="row collapse">\r\n            <div class="large-12 columns">\r\n                <table class="bumped">\r\n                    <thead>\r\n                        <tr>\r\n                            <th>Areas</th>\r\n                            <th class="right" data-bind="fastbutton: toggleRemoveItems">\r\n                                <i data-bind="css: removeItems() ? \'fi-x\' : \'fi-trash\'"></i>\r\n                            </th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody data-bind="foreach: items">\r\n                        <tr>\r\n                            <td colspan="2">\r\n                                <a data-bind="fastbutton: $parent.selectItem">\r\n                                    <span data-bind="text: Name"></span>\r\n                                    <span class="right" data-bind="ifnot: $parent.removeItems">&#62</span>\r\n                                    <span class="right" data-bind="if: $parent.removeItems">\r\n                                        <i class="fi-trash"></i>\r\n                                    </span>\r\n                                </a>\r\n                            </td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n        </div>\r\n        <p class="error" data-bind="text: error"></p>\r\n    </div>\r\n</div>\r\n';});

define('text!views/areas/create.html',[],function () { return '<section data-bind="compose: { view: \'shared/_area-input\' }"></section>';});

define('text!views/areas/edit.html',[],function () { return '<section data-bind="compose: { view: \'shared/_area-input\' }"></section>';});

define('text!views/funds/browse.html',[],function () { return '<div class="row">\r\n    <div class="large-12 columns">\r\n        <h4 class="view-heading">FUNDS</h4>\r\n\r\n        <div class="row">\r\n            <div class="large-12 columns">\r\n                <a data-bind="click: navigateToCreateView">Create a new fund</a>\r\n            </div>\r\n        </div>\r\n\r\n        <p class="error" data-bind="if: error, text: error"></p>\r\n\r\n        <div class="row">\r\n            <div class="large-4 columns">\r\n                <label for="Area">\r\n                    Fund requesting area\r\n                </label>\r\n                <select name="Area" data-bind="foreach: areas, value: selectedAreaId">\r\n                    <option data-bind="attr: { value: Id }, text: Name"></option>\r\n                </select>\r\n            </div>\r\n        </div>\r\n\r\n        <div class="row">\r\n            <div class="large-12 columns">\r\n                <table class="tabular" data-bind="visible: !noItemsToShow()">\r\n                    <thead>\r\n                        <tr>\r\n                            <th>Fund number</th>\r\n                            <th>Fund title</th>\r\n                            <th>Fund responsible person</th>\r\n                            <th class="hide-for-medium-down">Fund current fiscal year approved budget</th>\r\n                            <th class="hide-for-medium-down">Fund current fiscal year projected expenditures</th>\r\n                            <th class="hide-for-medium-down">Fund requested budget</th>\r\n                            <th class="hide-for-medium-down">Fund variance</th>\r\n                            <th class="hide-for-medium-down">Fund status</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody data-bind="foreach: items">\r\n                        <tr>\r\n                            <td>\r\n                                <a data-bind="fastlink: \'#/funds/edit/\' + Id, text: Number"></a>\r\n                            </td>\r\n                            <td data-bind="text: Title"></td>\r\n                            <td data-bind="text: ResponsiblePerson"></td>\r\n                            <td class="hide-for-medium-down" data-bind="text: formattedCurrentBudget"></td>\r\n                            <td class="hide-for-medium-down" data-bind="text: formattedProjectedExpenditures"></td>\r\n                            <td class="hide-for-medium-down" data-bind="text: formattedRequestedBudget"></td>\r\n                            <td class="hide-for-medium-down" data-bind="text: formattedVariance"></td>\r\n                            <td class="hide-for-medium-down" data-bind="text: fundStatusText"></td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n        </div>\r\n\r\n        <p data-bind="if: noItemsToShow">No records</p>\r\n    </div>\r\n</div>\r\n';});

define('text!views/funds/create.html',[],function () { return '<section data-bind="compose: { view: \'shared/_fund-input\' }"></section>';});

define('text!views/funds/edit.html',[],function () { return '<section data-bind="compose: { view: \'shared/_fund-input\' }"></section>';});

define('text!views/reports/funding-request.html',[],function () { return '<div class="row">\r\n    <div class="large-12 columns">\r\n        <h4 class="view-heading">FUNDING REQUEST REPORT</h4>\r\n\r\n        <div class="row">\r\n            <div class="large-12 columns">\r\n                <p>\r\n                    <a href="http://foundationportal.cloudapp.net/reportfile/fundingrequest">Download Excel version</a>\r\n                </p>\r\n            </div>\r\n        </div>\r\n\r\n        <div class="row">\r\n            <div class="large-12 columns">\r\n                <table class="tabular">\r\n                    <thead>\r\n                        <tr>\r\n                            <th>Fund number</th>\r\n                            <th>Fund title</th>\r\n                            <th>Fund responsible person</th>\r\n                            <th>Fund current fiscal year approved budget</th>\r\n                            <th>Fund current fiscal year projected expenditures</th>\r\n                            <th>Fund requested budget</th>\r\n                            <th>Fund variance</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <!-- ko foreach: items -->\r\n                    <tbody data-bind="ifnot: Number() === \'O\'">\r\n                        <tr>\r\n                            <td colspan="7" class="text-center" data-bind="text: Name"></td>\r\n                        </tr>\r\n                        <!-- ko foreach: funds -->\r\n                        <tr>\r\n                            <td data-bind="text: Number"></td>\r\n                            <td data-bind="text: Title"></td>\r\n                            <td data-bind="text: ResponsiblePerson"></td>\r\n                            <td data-bind="text: formattedCurrentBudget"></td>\r\n                            <td data-bind="text: formattedProjectedExpenditures"></td>\r\n                            <td data-bind="text: formattedRequestedBudget"></td>\r\n                            <td data-bind="text: formattedVariance"></td>\r\n                        </tr>\r\n                        <!--/ko-->\r\n                    </tbody>\r\n                    <tbody data-bind="ifnot: Number() === \'O\'">\r\n                        <tr class="subtotal" data-bind="with: subtotals">\r\n                            <td colspan="3" data-bind="text: \'Total for \' + $parent.Name()"></td>\r\n                            <td data-bind="text: formattedCurrentBudget"></td>\r\n                            <td data-bind="text: formattedProjectedExpenditures"></td>\r\n                            <td data-bind="text: formattedRequestedBudget"></td>\r\n                            <td data-bind="text: formattedVariance"></td>\r\n                        </tr>\r\n                    </tbody>\r\n                    <!--/ko-->\r\n                    <tbody>\r\n                        <tr class="grandtotal" data-bind="with: grandTotals">\r\n                            <td colspan="3">Grand totals</td>\r\n                            <td data-bind="text: formattedCurrentBudget"></td>\r\n                            <td data-bind="text: formattedProjectedExpenditures"></td>\r\n                            <td data-bind="text: formattedRequestedBudget"></td>\r\n                            <td data-bind="text: formattedVariance"></td>\r\n                        </tr>\r\n                    </tbody>\r\n                    <!-- ko foreach: items -->\r\n                    <tbody data-bind="if: Number() === \'O\'">\r\n                        <tr>\r\n                            <td colspan="7" class="text-center" data-bind="text: Name"></td>\r\n                        </tr>\r\n                        <!-- ko foreach: funds -->\r\n                        <tr>\r\n                            <td data-bind="text: Number"></td>\r\n                            <td data-bind="text: Title"></td>\r\n                            <td data-bind="text: ResponsiblePerson"></td>\r\n                            <td data-bind="text: formattedCurrentBudget"></td>\r\n                            <td data-bind="text: formattedProjectedExpenditures"></td>\r\n                            <td data-bind="text: formattedRequestedBudget"></td>\r\n                            <td data-bind="text: formattedVariance"></td>\r\n                        </tr>\r\n                        <!--/ko-->\r\n                    </tbody>\r\n                    <tbody data-bind="if: Number() === \'O\'">\r\n                        <tr class="subtotal" data-bind="with: subtotals">\r\n                            <td colspan="3" data-bind="text: \'Total for \' + $parent.Name()"></td>\r\n                            <td data-bind="text: formattedCurrentBudget"></td>\r\n                            <td data-bind="text: formattedProjectedExpenditures"></td>\r\n                            <td data-bind="text: formattedRequestedBudget"></td>\r\n                            <td data-bind="text: formattedVariance"></td>\r\n                        </tr>\r\n                    </tbody>\r\n                    <!--/ko-->\r\n                </table>\r\n            </div>\r\n        </div>\r\n    </div>\r\n</div>\r\n\r\n';});

define('text!views/reports/narrative.html',[],function () { return '<div class="row">\r\n    <div class="large-12 columns">\r\n        <h4 class="view-heading">NARRATIVE REPORT</h4>\r\n\r\n        <!-- ko foreach: items -->\r\n        <fieldset>\r\n            <h5 data-bind="text: Name"></h5>\r\n\r\n            <!-- ko foreach: funds -->\r\n            <div class="row">\r\n                <div class="large-12 columns">\r\n                    <div class="panel">\r\n                        <p>\r\n                            <strong data-bind="text: Title"></strong><span data-bind="    text: \' (\' + Number() + \')\'"></span>\r\n                        </p>\r\n\r\n                        <p data-bind="text: Description"></p>\r\n\r\n                        <div class="mild-callout panel" data-bind="visible: variance() !== 0">\r\n                            <p>\r\n                                <strong>Variance: </strong><span data-bind="text: formattedVariance"></span>\r\n                            </p>\r\n\r\n                            <p data-bind="text: BudgetAdjustmentNote"></p>\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n            </div>\r\n            <!--/ko-->\r\n\r\n            <p data-bind="if: funds().length === 0">No records</p>\r\n        </fieldset>\r\n        <!--/ko-->\r\n    </div>\r\n</div>\r\n';});

define('text!views/shared/_area-input.html',[],function () { return '<div class="row">\r\n    <div class="large-12 columns">\r\n        <section data-bind="with: item">\r\n            <h4 class="view-heading">AREA INFORMATION</h4>\r\n\r\n            <fieldset>\r\n                <h5>Details</h5>\r\n\r\n                <div class="row">\r\n                    <div class="large-4 columns">\r\n                        <label for="Number">\r\n                            Number<span class="required">*</span>\r\n                        </label>\r\n                        <input name="Number" type="text" data-bind="value: Number" />\r\n                        <label for="Number"\r\n                            class="error-message" data-bind="validationMessage: Number"></label>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-6 columns">\r\n                        <label for="Name">\r\n                            Name<span class="required">*</span>\r\n                        </label>\r\n                        <input name="Name" type="text" data-bind="value: Name" />\r\n                        <label for="Name"\r\n                            class="error-message" data-bind="validationMessage: Name"></label>\r\n                    </div>\r\n                </div>\r\n            </fieldset>\r\n\r\n            <div class="row">\r\n                <div class="large-12 columns">\r\n                    <span class="text-button" data-bind="click: $parent.saveItem">\r\n                        Save\r\n                    </span>\r\n                </div>\r\n            </div>\r\n        </section>\r\n    </div>\r\n</div>';});

define('text!views/shared/_fund-input.html',[],function () { return '<div class="row">\r\n    <div class="large-12 columns">\r\n        <section data-bind="with: item">\r\n            <h4 class="view-heading">FUND INFORMATION</h4>\r\n\r\n            <fieldset>\r\n                <h5>Fund current status</h5>\r\n\r\n                <div class="row">\r\n                    <div class="large-4 columns">\r\n                        <label for="Status">\r\n                            Fund status\r\n                        </label>\r\n                        <select name="Status" data-bind="value: Status">\r\n                            <option value="1">Draft</option>\r\n                            <option value="2">Final</option>\r\n                        </select>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-4 columns">\r\n                        <label for="Number">\r\n                            Fund number<span class="required">*</span>\r\n                        </label>\r\n                        <input name="Number" type="text" data-bind="value: Number, css: { validationElement: true }" />\r\n                        <label for="Number" class="error-message" data-bind="validationMessage: Number"></label>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-8 columns">\r\n                        <label for="Title">\r\n                            Fund title<span class="required">*</span>\r\n                        </label>\r\n                        <input name="Title" type="text" data-bind="value: Title" />\r\n                        <label for="Title" class="error-message" data-bind="validationMessage: Title"></label>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-6 columns">\r\n                        <label for="ResponsiblePerson">\r\n                            Fund responsible person<span class="required">*</span>\r\n                        </label>\r\n                        <input name="ResponsiblePerson" type="text" data-bind="value: ResponsiblePerson" />\r\n                        <label for="ResponsiblePerson"\r\n                            class="error-message" data-bind="validationMessage: ResponsiblePerson"></label>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-6 columns">\r\n                        <label for="CurrentBudget">\r\n                            Fund current fiscal year approved budget<span class="required">*</span>\r\n                        </label>\r\n                        <input name="CurrentBudget" type="text" data-bind="value: formattedCurrentBudget" />\r\n                        <label for="CurrentBudget"\r\n                            class="error-message" data-bind="validationMessage: CurrentBudget"></label>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-6 columns">\r\n                        <label for="ProjectedExpenditures">\r\n                            Fund current fiscal year projected expenditures<span class="required">*</span>\r\n                        </label>\r\n                        <input name="ProjectedExpenditures" type="text" data-bind="value: formattedProjectedExpenditures" />\r\n                        <label for="ProjectedExpenditures"\r\n                            class="error-message" data-bind="validationMessage: ProjectedExpenditures"></label>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-6 columns">\r\n                        <div class="input-panel">\r\n                            <span>Fund projected year-end balance:\r\n                            <strong \r\n                                data-bind="text: formattedProjectedYearEndBalance"></strong>\r\n                            </span>\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n            </fieldset>\r\n\r\n            <fieldset>\r\n                <h5>Fund next year projected budget</h5>\r\n\r\n                <div class="row">\r\n                    <div class="large-4 columns">\r\n                        <label for="BudgetAdjustment">\r\n                            Fund projected increase or decrease<span class="required">*</span>\r\n                        </label>\r\n                        <input name="BudgetAdjustment" type="text" data-bind="value: formattedBudgetAdjustment" />\r\n                        <label for="BudgetAdjustment"\r\n                            class="error-message" data-bind="validationMessage: BudgetAdjustment"></label>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-6 columns">\r\n                        <div class="input-panel">\r\n                            <span>Fund requested budget: \r\n                            <strong \r\n                                data-bind="text: formattedRequestedBudget"></strong>\r\n                            </span>\r\n                        </div>\r\n                    </div>\r\n                </div>\r\n            </fieldset>\r\n\r\n            <fieldset>\r\n                <h5>Fund supporting information</h5>\r\n\r\n                <div class="row">\r\n                    <div class="large-12 columns">\r\n                        <label for="Description">\r\n                            Brief description of the program and types of expenses paid for by this fund<span class="required">*</span>\r\n                        </label>\r\n                        <p class="print-only" data-bind="text: Description"></p>\r\n                        <textarea name="Description" class="hide-on-print"\r\n                            data-bind="value: Description"></textarea>\r\n                        <label for="Description"\r\n                            class="error-message" data-bind="validationMessage: Description"></label>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-12 columns">\r\n                        <label for="BudgetAdjustmentNote">\r\n                            Reason for increase or decrease in the requested budget for this fund<span class="required"\r\n                            data-bind="visible: BudgetAdjustment() > 0">*</span>\r\n                        </label>\r\n                        <p class="print-only" data-bind="text: BudgetAdjustmentNote"></p>\r\n                        <textarea name="BudgetAdjustmentNote" class="hide-on-print"\r\n                            data-bind="value: BudgetAdjustmentNote"></textarea>\r\n                        <label for="BudgetAdjustmentNote"\r\n                            class="error-message" data-bind="validationMessage: BudgetAdjustmentNote"></label>\r\n                    </div>\r\n                </div>\r\n            </fieldset>\r\n\r\n            <fieldset>\r\n                <h5>Fund attachments</h5>\r\n\r\n                <div class="row">\r\n                    <div class="large-12 columns">\r\n                        <p>\r\n                            <a href="http://www.obfp.vt.edu/forms/foundation-portal/budget-request-template.xlsx">Download budget request template</a>\r\n                        </p>\r\n                    </div>\r\n                </div>\r\n\r\n                <form name="fileInputForm">\r\n                    <input type="file" name="files[]" multiple\r\n                        data-bind="event: { onload: window.fileInputForm.reset(), change: $parent.postFiles }" />\r\n                </form>\r\n\r\n                <div class="row">\r\n                    <div class="large-12 columns">\r\n                        <table data-bind="visible: FileUploads().length > 0">\r\n                            <thead>\r\n                                <tr>\r\n                                    <th>File</th>\r\n                                    <th></th>\r\n                                </tr>\r\n                            </thead>\r\n                            <tbody data-bind="foreach: FileUploads">\r\n                                <tr data-bind="visible: !destroy()">\r\n                                    <td>\r\n                                        <a data-bind="visible: Id, text: OriginalFileName,\r\n    attr: { href: Source }"></a>\r\n                                        <span class="error-message"\r\n                                            data-bind="visible: errorMessage, text: errorMessage"></span>\r\n                                    </td>\r\n                                    <td data-bind="click: $root.removeFileUpload">\r\n                                        <i class="fi-trash"></i>\r\n                                    </td>\r\n                                </tr>\r\n                            </tbody>\r\n                        </table>\r\n\r\n                        <p data-bind="visible: FileUploads().length === 0">No files uploaded</p>\r\n                    </div>\r\n                </div>\r\n            </fieldset>\r\n\r\n            <div class="row" data-bind="visible: errorMessage">\r\n                <div class="large-12 columns">\r\n                    <p>\r\n                        <span class="error-message"\r\n                            data-bind="text: errorMessage"></span>\r\n                    </p>\r\n                </div>\r\n            </div>\r\n\r\n            <div class="row">\r\n                <div class="large-12 columns">\r\n                    <span class="text-button" data-bind="click: $parent.saveItem">Save\r\n                    </span>\r\n                </div>\r\n            </div>\r\n        </section>\r\n\r\n    </div>\r\n</div>\r\n';});

define('text!views/shared/_top-bar.html',[],function () { return '<nav class="top-bar" data-options="is_hover:false">\r\n    <ul class="title-area">\r\n        <!-- Title Area -->\r\n        <li class="name">\r\n            <h1><a href="#">Top Bar Title </a></h1>\r\n        </li>\r\n        <!-- Remove the class "menu-icon" to get rid of menu icon. Take out "Menu" to just have icon alone -->\r\n        <li class="toggle-topbar menu-icon"><a href="#"><span>Menu</span></a></li>\r\n    </ul>\r\n\r\n    <section class="top-bar-section">\r\n        <!-- Left Nav Section -->\r\n        <ul class="left">\r\n            <li class="divider"></li>\r\n            <li class="active"><a href="#">Main Item 1</a></li>\r\n            <li class="divider"></li>\r\n            <li><a href="#">Main Item 2</a></li>\r\n            <li class="divider"></li>\r\n            <li class="has-dropdown"><a href="#">Main Item 3</a>\r\n\r\n                <ul class="dropdown">\r\n                    <li class="has-dropdown"><a href="#">Dropdown Level 1a</a>\r\n\r\n                        <ul class="dropdown">\r\n                            <li>\r\n                                <label>Dropdown Level 2 Label</label></li>\r\n                            <li><a href="#">Dropdown Level 2a</a></li>\r\n                            <li><a href="#">Dropdown Level 2b</a></li>\r\n                            <li class="has-dropdown"><a href="#">Dropdown Level 2c</a>\r\n\r\n                                <ul class="dropdown">\r\n                                    <li>\r\n                                        <label>Dropdown Level 3 Label</label></li>\r\n                                    <li><a href="#">Dropdown Level 3a</a></li>\r\n                                    <li><a href="#">Dropdown Level 3b</a></li>\r\n                                    <li class="divider"></li>\r\n                                    <li><a href="#">Dropdown Level 3c</a></li>\r\n                                </ul>\r\n                            </li>\r\n                            <li><a href="#">Dropdown Level 2d</a></li>\r\n                            <li><a href="#">Dropdown Level 2e</a></li>\r\n                            <li><a href="#">Dropdown Level 2f</a></li>\r\n                        </ul>\r\n                    </li>\r\n                    <li><a href="#">Dropdown Level 1b</a></li>\r\n                    <li><a href="#">Dropdown Level 1c</a></li>\r\n                    <li class="divider"></li>\r\n                    <li><a href="#">Dropdown Level 1d</a></li>\r\n                    <li><a href="#">Dropdown Level 1e</a></li>\r\n                    <li><a href="#">Dropdown Level 1f</a></li>\r\n                    <li class="divider"></li>\r\n                    <li><a href="#">See all &rarr;</a></li>\r\n                </ul>\r\n            </li>\r\n            <li class="divider"></li>\r\n        </ul>\r\n\r\n        <!-- Right Nav Section -->\r\n        <ul class="right">\r\n            <li class="divider hide-for-small"></li>\r\n            <li class="has-dropdown"><a href="#">Main Item 4</a>\r\n\r\n                <ul class="dropdown">\r\n                    <li>\r\n                        <label>Dropdown Level 1 Label</label></li>\r\n                    <li class="has-dropdown"><a href="#" class="">Dropdown Level 1a</a>\r\n\r\n                        <ul class="dropdown">\r\n                            <li><a href="#">Dropdown Level 2a</a></li>\r\n                            <li><a href="#">Dropdown Level 2b</a></li>\r\n                            <li class="has-dropdown"><a href="#">Dropdown Level 2c</a>\r\n\r\n                                <ul class="dropdown">\r\n                                    <li><a href="#">Dropdown Level 3a</a></li>\r\n                                    <li><a href="#">Dropdown Level 3b</a></li>\r\n                                    <li><a href="#">Dropdown Level 3c</a></li>\r\n                                </ul>\r\n                            </li>\r\n                            <li><a href="#">Dropdown Level 2d</a></li>\r\n                            <li><a href="#">Dropdown Level 2e</a></li>\r\n                            <li><a href="#">Dropdown Level 2f</a></li>\r\n                        </ul>\r\n                    </li>\r\n                    <li><a href="#">Dropdown Level 1b</a></li>\r\n                    <li><a href="#">Dropdown Level 1c</a></li>\r\n                    <li class="divider"></li>\r\n                    <li>\r\n                        <label>Dropdown Level 1 Label</label></li>\r\n                    <li><a href="#">Dropdown Level 1d</a></li>\r\n                    <li><a href="#">Dropdown Level 1e</a></li>\r\n                    <li><a href="#">Dropdown Level 1f</a></li>\r\n                    <li class="divider"></li>\r\n                    <li><a href="#">See all &rarr;</a></li>\r\n                </ul>\r\n            </li>\r\n            <li class="divider"></li>\r\n            <li class="has-form">\r\n                <form>\r\n                    <div class="row collapse">\r\n                        <div class="small-8 columns">\r\n                            <input type="text">\r\n                        </div>\r\n                        <div class="small-4 columns">\r\n                            <a href="#" class="alert button">Search</a>\r\n                        </div>\r\n                    </div>\r\n                </form>\r\n            </li>\r\n            <li class="divider show-for-small"></li>\r\n            <li class="has-form">\r\n                <a class="button" href="#">Button!</a>\r\n            </li>\r\n        </ul>\r\n    </section>\r\n</nav>\r\n';});

define('text!views/shell.html',[],function () { return '<div class="contain-to-grid">\r\n    <nav class="top-bar">\r\n        <ul class="title-area">\r\n            <!-- Title Area -->\r\n            <li class="name">\r\n                <!-- Leave this empty -->\r\n            </li>\r\n            <!-- Remove the class "menu-icon" to get rid of menu icon. Take out "Menu" to just have icon alone -->\r\n            <li class="toggle-topbar menu-icon"><a href="#"><span></span></a></li>\r\n        </ul>\r\n\r\n        <section class="top-bar-section">\r\n            <ul class="right">\r\n                <li><a href="/#/funds/browse">Funds</a></li>\r\n                <li class="has-dropdown"><a>Reports</a>\r\n                    <ul class="dropdown">\r\n                        <li><a href="/#/reports/funding-request">Funding Request</a></li>\r\n                        <li><a href="/#/reports/narrative">Narrative</a></li>\r\n                    </ul>\r\n                </li>\r\n                <li><a href="/home/logout">Logout</a></li>\r\n            </ul>\r\n        </section>\r\n    </nav>\r\n</div>\r\n\r\n<div class="row view-background">\r\n    <div class="large-12 columns">\r\n        <h1 class="app-heading">Foundation<span>Portal</span></h1>\r\n\r\n        <section id="content" data-bind="router: { transition: \'scrollers\', cacheViews: true }">\r\n        </section>\r\n\r\n        <div id="timeoutModal" class="small reveal-modal" data-options="closeOnBackgroundClick: false">\r\n            <h4>Your session is about to timeout.</h4>\r\n            <p>\r\n                You will be logged out in <span class="counter"></span>seconds. Click continue to\r\n                extend your session.\r\n            </p>\r\n\r\n            <span class="text-button button-close-reveal-modal">Continue</span>\r\n\r\n            <a class="close-reveal-modal">&#215;</a>\r\n        </div>\r\n    </div>\r\n</div>\r\n';});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The dialog module enables the display of message boxes, custom modal dialogs and other overlays or slide-out UI abstractions. Dialogs are constructed by the composition system which interacts with a user defined dialog context. The dialog module enforced the activator lifecycle.
 * @module dialog
 * @requires system
 * @requires app
 * @requires composition
 * @requires activator
 * @requires viewEngine
 * @requires jquery
 * @requires knockout
 */
define('plugins/dialog',['durandal/system', 'durandal/app', 'durandal/composition', 'durandal/activator', 'durandal/viewEngine', 'jquery', 'knockout'], function (system, app, composition, activator, viewEngine, $, ko) {
    var contexts = {},
        dialogCount = 0,
        dialog;

    /**
     * Models a message box's message, title and options.
     * @class MessageBox
     */
    var MessageBox = function(message, title, options) {
        this.message = message;
        this.title = title || MessageBox.defaultTitle;
        this.options = options || MessageBox.defaultOptions;
    };

    /**
     * Selects an option and closes the message box, returning the selected option through the dialog system's promise.
     * @method selectOption
     * @param {string} dialogResult The result to select.
     */
    MessageBox.prototype.selectOption = function (dialogResult) {
        dialog.close(this, dialogResult);
    };

    /**
     * Provides the view to the composition system.
     * @method getView
     * @return {DOMElement} The view of the message box.
     */
    MessageBox.prototype.getView = function(){
        return viewEngine.processMarkup(MessageBox.defaultViewMarkup);
    };

    /**
     * Configures a custom view to use when displaying message boxes.
     * @method setViewUrl
     * @param {string} viewUrl The view url relative to the base url which the view locator will use to find the message box's view.
     * @static
     */
    MessageBox.setViewUrl = function(viewUrl){
        delete MessageBox.prototype.getView;
        MessageBox.prototype.viewUrl = viewUrl;
    };

    /**
     * The title to be used for the message box if one is not provided.
     * @property {string} defaultTitle
     * @default Application
     * @static
     */
    MessageBox.defaultTitle = app.title || 'Application';

    /**
     * The options to display in the message box of none are specified.
     * @property {string[]} defaultOptions
     * @default ['Ok']
     * @static
     */
    MessageBox.defaultOptions = ['Ok'];

    /**
     * The markup for the message box's view.
     * @property {string} defaultViewMarkup
     * @static
     */
    MessageBox.defaultViewMarkup = [
        '<div data-view="plugins/messageBox" class="messageBox">',
            '<div class="modal-header">',
                '<h3 data-bind="text: title"></h3>',
            '</div>',
            '<div class="modal-body">',
                '<p class="message" data-bind="text: message"></p>',
            '</div>',
            '<div class="modal-footer" data-bind="foreach: options">',
                '<button class="btn" data-bind="click: function () { $parent.selectOption($data); }, text: $data, css: { \'btn-primary\': $index() == 0, autofocus: $index() == 0 }"></button>',
            '</div>',
        '</div>'
    ].join('\n');

    function ensureDialogInstance(objOrModuleId) {
        return system.defer(function(dfd) {
            if (system.isString(objOrModuleId)) {
                system.acquire(objOrModuleId).then(function (module) {
                    dfd.resolve(system.resolveObject(module));
                }).fail(function(err){
                    system.error('Failed to load dialog module (' + objOrModuleId + '). Details: ' + err.message);
                });
            } else {
                dfd.resolve(objOrModuleId);
            }
        }).promise();
    }

    /**
     * @class DialogModule
     * @static
     */
    dialog = {
        /**
         * The constructor function used to create message boxes.
         * @property {MessageBox} MessageBox
         */
        MessageBox:MessageBox,
        /**
         * The css zIndex that the last dialog was displayed at.
         * @property {number} currentZIndex
         */
        currentZIndex: 1050,
        /**
         * Gets the next css zIndex at which a dialog should be displayed.
         * @method getNextZIndex
         * @return {number} The next usable zIndex.
         */
        getNextZIndex: function () {
            return ++this.currentZIndex;
        },
        /**
         * Determines whether or not there are any dialogs open.
         * @method isOpen
         * @return {boolean} True if a dialog is open. false otherwise.
         */
        isOpen: function() {
            return dialogCount > 0;
        },
        /**
         * Gets the dialog context by name or returns the default context if no name is specified.
         * @method getContext
         * @param {string} [name] The name of the context to retrieve.
         * @return {DialogContext} True context.
         */
        getContext: function(name) {
            return contexts[name || 'default'];
        },
        /**
         * Adds (or replaces) a dialog context.
         * @method addContext
         * @param {string} name The name of the context to add.
         * @param {DialogContext} dialogContext The context to add.
         */
        addContext: function(name, dialogContext) {
            dialogContext.name = name;
            contexts[name] = dialogContext;

            var helperName = 'show' + name.substr(0, 1).toUpperCase() + name.substr(1);
            this[helperName] = function (obj, activationData) {
                return this.show(obj, activationData, name);
            };
        },
        createCompositionSettings: function(obj, dialogContext) {
            var settings = {
                model:obj,
                activate:false,
                transition: false
            };

            if (dialogContext.attached) {
                settings.attached = dialogContext.attached;
            }

            if (dialogContext.compositionComplete) {
                settings.compositionComplete = dialogContext.compositionComplete;
            }

            return settings;
        },
        /**
         * Gets the dialog model that is associated with the specified object.
         * @method getDialog
         * @param {object} obj The object for whom to retrieve the dialog.
         * @return {Dialog} The dialog model.
         */
        getDialog:function(obj){
            if(obj){
                return obj.__dialog__;
            }

            return undefined;
        },
        /**
         * Closes the dialog associated with the specified object.
         * @method close
         * @param {object} obj The object whose dialog should be closed.
         * @param {object} results* The results to return back to the dialog caller after closing.
         */
        close:function(obj){
            var theDialog = this.getDialog(obj);
            if(theDialog){
                var rest = Array.prototype.slice.call(arguments, 1);
                theDialog.close.apply(theDialog, rest);
            }
        },
        /**
         * Shows a dialog.
         * @method show
         * @param {object|string} obj The object (or moduleId) to display as a dialog.
         * @param {object} [activationData] The data that should be passed to the object upon activation.
         * @param {string} [context] The name of the dialog context to use. Uses the default context if none is specified.
         * @return {Promise} A promise that resolves when the dialog is closed and returns any data passed at the time of closing.
         */
        show: function(obj, activationData, context) {
            var that = this;
            var dialogContext = contexts[context || 'default'];

            return system.defer(function(dfd) {
                ensureDialogInstance(obj).then(function(instance) {
                    var dialogActivator = activator.create();

                    dialogActivator.activateItem(instance, activationData).then(function (success) {
                        if (success) {
                            var theDialog = instance.__dialog__ = {
                                owner: instance,
                                context: dialogContext,
                                activator: dialogActivator,
                                close: function () {
                                    var args = arguments;
                                    dialogActivator.deactivateItem(instance, true).then(function (closeSuccess) {
                                        if (closeSuccess) {
                                            dialogCount--;
                                            dialogContext.removeHost(theDialog);
                                            delete instance.__dialog__;

                                            if (args.length === 0) {
                                                dfd.resolve();
                                            } else if (args.length === 1) {
                                                dfd.resolve(args[0]);
                                            } else {
                                                dfd.resolve.apply(dfd, args);
                                            }
                                        }
                                    });
                                }
                            };

                            theDialog.settings = that.createCompositionSettings(instance, dialogContext);
                            dialogContext.addHost(theDialog);

                            dialogCount++;
                            composition.compose(theDialog.host, theDialog.settings);
                        } else {
                            dfd.resolve(false);
                        }
                    });
                });
            }).promise();
        },
        /**
         * Shows a message box.
         * @method showMessage
         * @param {string} message The message to display in the dialog.
         * @param {string} [title] The title message.
         * @param {string[]} [options] The options to provide to the user.
         * @return {Promise} A promise that resolves when the message box is closed and returns the selected option.
         */
        showMessage:function(message, title, options){
            if(system.isString(this.MessageBox)){
                return dialog.show(this.MessageBox, [
                    message,
                    title || MessageBox.defaultTitle,
                    options || MessageBox.defaultOptions
                ]);
            }

            return dialog.show(new this.MessageBox(message, title, options));
        },
        /**
         * Installs this module into Durandal; called by the framework. Adds `app.showDialog` and `app.showMessage` convenience methods.
         * @method install
         * @param {object} [config] Add a `messageBox` property to supply a custom message box constructor. Add a `messageBoxView` property to supply custom view markup for the built-in message box.
         */
        install:function(config){
            app.showDialog = function(obj, activationData, context) {
                return dialog.show(obj, activationData, context);
            };

            app.showMessage = function(message, title, options) {
                return dialog.showMessage(message, title, options);
            };

            if(config.messageBox){
                dialog.MessageBox = config.messageBox;
            }

            if(config.messageBoxView){
                dialog.MessageBox.prototype.getView = function(){
                    return config.messageBoxView;
                };
            }
        }
    };

    /**
     * @class DialogContext
     */
    dialog.addContext('default', {
        blockoutOpacity: .2,
        removeDelay: 200,
        /**
         * In this function, you are expected to add a DOM element to the tree which will serve as the "host" for the modal's composed view. You must add a property called host to the modalWindow object which references the dom element. It is this host which is passed to the composition module.
         * @method addHost
         * @param {Dialog} theDialog The dialog model.
         */
        addHost: function(theDialog) {
            var body = $('body');
            var blockout = $('<div class="modalBlockout"></div>')
                .css({ 'z-index': dialog.getNextZIndex(), 'opacity': this.blockoutOpacity })
                .appendTo(body);

            var host = $('<div class="modalHost"></div>')
                .css({ 'z-index': dialog.getNextZIndex() })
                .appendTo(body);

            theDialog.host = host.get(0);
            theDialog.blockout = blockout.get(0);

            if (!dialog.isOpen()) {
                theDialog.oldBodyMarginRight = body.css("margin-right");
                theDialog.oldInlineMarginRight = body.get(0).style.marginRight;

                var html = $("html");
                var oldBodyOuterWidth = body.outerWidth(true);
                var oldScrollTop = html.scrollTop();
                $("html").css("overflow-y", "hidden");
                var newBodyOuterWidth = $("body").outerWidth(true);
                body.css("margin-right", (newBodyOuterWidth - oldBodyOuterWidth + parseInt(theDialog.oldBodyMarginRight, 10)) + "px");
                html.scrollTop(oldScrollTop); // necessary for Firefox
            }
        },
        /**
         * This function is expected to remove any DOM machinery associated with the specified dialog and do any other necessary cleanup.
         * @method removeHost
         * @param {Dialog} theDialog The dialog model.
         */
        removeHost: function(theDialog) {
            $(theDialog.host).css('opacity', 0);
            $(theDialog.blockout).css('opacity', 0);

            setTimeout(function() {
                ko.removeNode(theDialog.host);
                ko.removeNode(theDialog.blockout);
            }, this.removeDelay);

            if (!dialog.isOpen()) {
                var html = $("html");
                var oldScrollTop = html.scrollTop(); // necessary for Firefox.
                html.css("overflow-y", "").scrollTop(oldScrollTop);

                if(theDialog.oldInlineMarginRight) {
                    $("body").css("margin-right", theDialog.oldBodyMarginRight);
                } else {
                    $("body").css("margin-right", '');
                }
            }
        },
        attached: function (view) {
            //To prevent flickering in IE8, we set visibility to hidden first, and later restore it
            $(view).css("visibility", "hidden");
        },
        /**
         * This function is called after the modal is fully composed into the DOM, allowing your implementation to do any final modifications, such as positioning or animation. You can obtain the original dialog object by using `getDialog` on context.model.
         * @method compositionComplete
         * @param {DOMElement} child The dialog view.
         * @param {DOMElement} parent The parent view.
         * @param {object} context The composition context.
         */
        compositionComplete: function (child, parent, context) {
            var theDialog = dialog.getDialog(context.model);
            var $child = $(child);
            var loadables = $child.find("img").filter(function () {
                //Remove images with known width and height
                var $this = $(this);
                return !(this.style.width && this.style.height) && !($this.attr("width") && $this.attr("height"));
            });

            $child.data("predefinedWidth", $child.get(0).style.width);

            var setDialogPosition = function () {
                //Setting a short timeout is need in IE8, otherwise we could do this straight away
                setTimeout(function () {
                    //We will clear and then set width for dialogs without width set 
                    if (!$child.data("predefinedWidth")) {
                        $child.css({ width: '' }); //Reset width
                    }
                    var width = $child.outerWidth(false);
                    var height = $child.outerHeight(false);
                    var windowHeight = $(window).height();
                    var constrainedHeight = Math.min(height, windowHeight);

                    $child.css({
                        'margin-top': (-constrainedHeight / 2).toString() + 'px',
                        'margin-left': (-width / 2).toString() + 'px'
                    });

                    if (!$child.data("predefinedWidth")) {
                        //Ensure the correct width after margin-left has been set
                        $child.outerWidth(width);
                    }

                    if (height > windowHeight) {
                        $child.css("overflow-y", "auto");
                    } else {
                        $child.css("overflow-y", "");
                    }

                    $(theDialog.host).css('opacity', 1);
                    $child.css("visibility", "visible");

                    $child.find('.autofocus').first().focus();
                }, 1);
            };

            setDialogPosition();
            loadables.load(setDialogPosition);

            if ($child.hasClass('autoclose')) {
                $(theDialog.blockout).click(function () {
                    theDialog.close();
                });
            }
        }
    });

    return dialog;
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Enables common http request scenarios.
 * @module http
 * @requires jquery
 * @requires knockout
 */
define('plugins/http',['jquery', 'knockout'], function($, ko) {
    /**
     * @class HTTPModule
     * @static
     */
    return {
        /**
         * The name of the callback parameter to inject into jsonp requests by default.
         * @property {string} callbackParam
         * @default callback
         */
        callbackParam:'callback',
        /**
         * Makes an HTTP GET request.
         * @method get
         * @param {string} url The url to send the get request to.
         * @param {object} [query] An optional key/value object to transform into query string parameters.
         * @return {Promise} A promise of the get response data.
         */
        get:function(url, query) {
            return $.ajax(url, { data: query });
        },
        /**
         * Makes an JSONP request.
         * @method jsonp
         * @param {string} url The url to send the get request to.
         * @param {object} [query] An optional key/value object to transform into query string parameters.
         * @param {string} [callbackParam] The name of the callback parameter the api expects (overrides the default callbackParam).
         * @return {Promise} A promise of the response data.
         */
        jsonp: function (url, query, callbackParam) {
            if (url.indexOf('=?') == -1) {
                callbackParam = callbackParam || this.callbackParam;

                if (url.indexOf('?') == -1) {
                    url += '?';
                } else {
                    url += '&';
                }

                url += callbackParam + '=?';
            }

            return $.ajax({
                url: url,
                dataType:'jsonp',
                data:query
            });
        },
        /**
         * Makes an HTTP POST request.
         * @method post
         * @param {string} url The url to send the post request to.
         * @param {object} data The data to post. It will be converted to JSON. If the data contains Knockout observables, they will be converted into normal properties before serialization.
         * @return {Promise} A promise of the response data.
         */
        post:function(url, data) {
            return $.ajax({
                url: url,
                data: ko.toJSON(data),
                type: 'POST',
                contentType: 'application/json',
                dataType: 'json'
            });
        }
    };
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Enables automatic observability of plain javascript object for ES5 compatible browsers. Also, converts promise properties into observables that are updated when the promise resolves.
 * @module observable
 * @requires system
 * @requires binder
 * @requires knockout
 */
define('plugins/observable',['durandal/system', 'durandal/binder', 'knockout'], function(system, binder, ko) {
    var observableModule,
        toString = Object.prototype.toString,
        nonObservableTypes = ['[object Function]', '[object String]', '[object Boolean]', '[object Number]', '[object Date]', '[object RegExp]'],
        observableArrayMethods = ['remove', 'removeAll', 'destroy', 'destroyAll', 'replace'],
        arrayMethods = ['pop', 'reverse', 'sort', 'shift', 'splice'],
        additiveArrayFunctions = ['push', 'unshift'],
        arrayProto = Array.prototype,
        observableArrayFunctions = ko.observableArray.fn,
        logConversion = false;

    /**
     * You can call observable(obj, propertyName) to get the observable function for the specified property on the object.
     * @class ObservableModule
     */

    function shouldIgnorePropertyName(propertyName){
        var first = propertyName[0];
        return first === '_' || first === '$';
    }

    function isNode(obj) {
        return !!(obj && obj.nodeType !== undefined && system.isNumber(obj.nodeType));
    }

    function canConvertType(value) {
        if (!value || isNode(value) || value.ko === ko || value.jquery) {
            return false;
        }

        var type = toString.call(value);

        return nonObservableTypes.indexOf(type) == -1 && !(value === true || value === false);
    }

    function makeObservableArray(original, observable) {
        var lookup = original.__observable__, notify = true;

        if(lookup && lookup.__full__){
            return;
        }

        lookup = lookup || (original.__observable__ = {});
        lookup.__full__ = true;

        observableArrayMethods.forEach(function(methodName) {
            original[methodName] = function() {
                notify = false;
                var methodCallResult = observableArrayFunctions[methodName].apply(observable, arguments);
                notify = true;
                return methodCallResult;
            };
        });

        arrayMethods.forEach(function(methodName) {
            original[methodName] = function() {
                if(notify){
                    observable.valueWillMutate();
                }

                var methodCallResult = arrayProto[methodName].apply(original, arguments);

                if(notify){
                    observable.valueHasMutated();
                }

                return methodCallResult;
            };
        });

        additiveArrayFunctions.forEach(function(methodName){
            original[methodName] = function() {
                for (var i = 0, len = arguments.length; i < len; i++) {
                    convertObject(arguments[i]);
                }

                if(notify){
                    observable.valueWillMutate();
                }

                var methodCallResult = arrayProto[methodName].apply(original, arguments);

                if(notify){
                    observable.valueHasMutated();
                }

                return methodCallResult;
            };
        });

        original['splice'] = function() {
            for (var i = 2, len = arguments.length; i < len; i++) {
                convertObject(arguments[i]);
            }

            if(notify){
                observable.valueWillMutate();
            }

            var methodCallResult = arrayProto['splice'].apply(original, arguments);

            if(notify){
                observable.valueHasMutated();
            }

            return methodCallResult;
        };

        for (var i = 0, len = original.length; i < len; i++) {
            convertObject(original[i]);
        }
    }

    /**
     * Converts an entire object into an observable object by re-writing its attributes using ES5 getters and setters. Attributes beginning with '_' or '$' are ignored.
     * @method convertObject
     * @param {object} obj The target object to convert.
     */
    function convertObject(obj){
        var lookup, value;

        if(!canConvertType(obj)){
            return;
        }

        lookup = obj.__observable__;

        if(lookup && lookup.__full__){
            return;
        }

        lookup = lookup || (obj.__observable__ = {});
        lookup.__full__ = true;

        if (system.isArray(obj)) {
            var observable = ko.observableArray(obj);
            makeObservableArray(obj, observable);
        } else {
            for (var propertyName in obj) {
                if(shouldIgnorePropertyName(propertyName)){
                    continue;
                }

                if(!lookup[propertyName]){
                    value = obj[propertyName];

                    if(!system.isFunction(value)){
                        convertProperty(obj, propertyName, value);
                    }
                }
            }
        }

        if(logConversion) {
            system.log('Converted', obj);
        }
    }

    function innerSetter(observable, newValue, isArray) {
        var val;
        observable(newValue);
        val = observable.peek();

        //if this was originally an observableArray, then always check to see if we need to add/replace the array methods (if newValue was an entirely new array)
        if (isArray) {
            if (!val) {
                //don't allow null, force to an empty array
                val = [];
                observable(val);
                makeObservableArray(val, observable);
            }
            else if (!val.destroyAll) {
                makeObservableArray(val, observable);
            }
        } else {
            convertObject(val);
        }
    }

    /**
     * Converts a normal property into an observable property using ES5 getters and setters.
     * @method convertProperty
     * @param {object} obj The target object on which the property to convert lives.
     * @param {string} propertyName The name of the property to convert.
     * @param {object} [original] The original value of the property. If not specified, it will be retrieved from the object.
     * @return {KnockoutObservable} The underlying observable.
     */
    function convertProperty(obj, propertyName, original){
        var observable,
            isArray,
            lookup = obj.__observable__ || (obj.__observable__ = {});

        if(original === undefined){
            original = obj[propertyName];
        }

        if (system.isArray(original)) {
            observable = ko.observableArray(original);
            makeObservableArray(original, observable);
            isArray = true;
        } else if (typeof original == "function") {
            if(ko.isObservable(original)){
                observable = original;
            }else{
                return null;
            }
        } else if(system.isPromise(original)) {
            observable = ko.observable();

            original.then(function (result) {
                if(system.isArray(result)) {
                    var oa = ko.observableArray(result);
                    makeObservableArray(result, oa);
                    result = oa;
                }

                observable(result);
            });
        } else {
            observable = ko.observable(original);
            convertObject(original);
        }

        Object.defineProperty(obj, propertyName, {
            configurable: true,
            enumerable: true,
            get: observable,
            set: ko.isWriteableObservable(observable) ? (function (newValue) {
                if (newValue && system.isPromise(newValue)) {
                    newValue.then(function (result) {
                        innerSetter(observable, result, system.isArray(result));
                    });
                } else {
                    innerSetter(observable, newValue, isArray);
                }
            }) : undefined
        });

        lookup[propertyName] = observable;
        return observable;
    }

    /**
     * Defines a computed property using ES5 getters and setters.
     * @method defineProperty
     * @param {object} obj The target object on which to create the property.
     * @param {string} propertyName The name of the property to define.
     * @param {function|object} evaluatorOrOptions The Knockout computed function or computed options object.
     * @return {KnockoutObservable} The underlying computed observable.
     */
    function defineProperty(obj, propertyName, evaluatorOrOptions) {
        var computedOptions = { owner: obj, deferEvaluation: true },
            computed;

        if (typeof evaluatorOrOptions === 'function') {
            computedOptions.read = evaluatorOrOptions;
        } else {
            if ('value' in evaluatorOrOptions) {
                system.error('For defineProperty, you must not specify a "value" for the property. You must provide a "get" function.');
            }

            if (typeof evaluatorOrOptions.get !== 'function') {
                system.error('For defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".');
            }

            computedOptions.read = evaluatorOrOptions.get;
            computedOptions.write = evaluatorOrOptions.set;
        }

        computed = ko.computed(computedOptions);
        obj[propertyName] = computed;

        return convertProperty(obj, propertyName, computed);
    }

    observableModule = function(obj, propertyName){
        var lookup, observable, value;

        if (!obj) {
            return null;
        }

        lookup = obj.__observable__;
        if(lookup){
            observable = lookup[propertyName];
            if(observable){
                return observable;
            }
        }

        value = obj[propertyName];

        if(ko.isObservable(value)){
            return value;
        }

        return convertProperty(obj, propertyName, value);
    };

    observableModule.defineProperty = defineProperty;
    observableModule.convertProperty = convertProperty;
    observableModule.convertObject = convertObject;

    /**
     * Installs the plugin into the view model binder's `beforeBind` hook so that objects are automatically converted before being bound.
     * @method install
     */
    observableModule.install = function(options) {
        var original = binder.binding;

        binder.binding = function(obj, view, instruction) {
            if(instruction.applyBindings && !instruction.skipConversion){
                convertObject(obj);
            }

            original(obj, view);
        };

        logConversion = options.logConversion;
    };

    return observableModule;
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Serializes and deserializes data to/from JSON.
 * @module serializer
 * @requires system
 */
define('plugins/serializer',['durandal/system'], function(system) {
    /**
     * @class SerializerModule
     * @static
     */
    return {
        /**
         * The name of the attribute that the serializer should use to identify an object's type.
         * @property {string} typeAttribute
         * @default type
         */
        typeAttribute: 'type',
        /**
         * The amount of space to use for indentation when writing out JSON.
         * @property {string|number} space
         * @default undefined
         */
        space:undefined,
        /**
         * The default replacer function used during serialization. By default properties starting with '_' or '$' are removed from the serialized object.
         * @method replacer
         * @param {string} key The object key to check.
         * @param {object} value The object value to check.
         * @return {object} The value to serialize.
         */
        replacer: function(key, value) {
            if(key){
                var first = key[0];
                if(first === '_' || first === '$'){
                    return undefined;
                }
            }

            return value;
        },
        /**
         * Serializes the object.
         * @method serialize
         * @param {object} object The object to serialize.
         * @param {object} [settings] Settings can specify a replacer or space to override the serializer defaults.
         * @return {string} The JSON string.
         */
        serialize: function(object, settings) {
            settings = (settings === undefined) ? {} : settings;

            if(system.isString(settings) || system.isNumber(settings)) {
                settings = { space: settings };
            }

            return JSON.stringify(object, settings.replacer || this.replacer, settings.space || this.space);
        },
        /**
         * Gets the type id for an object instance, using the configured `typeAttribute`.
         * @method getTypeId
         * @param {object} object The object to serialize.
         * @return {string} The type.
         */
        getTypeId: function(object) {
            if (object) {
                return object[this.typeAttribute];
            }

            return undefined;
        },
        /**
         * Maps type ids to object constructor functions. Keys are type ids and values are functions.
         * @property {object} typeMap.
         */
        typeMap: {},
        /**
         * Adds a type id/constructor function mampping to the `typeMap`.
         * @method registerType
         * @param {string} typeId The type id.
         * @param {function} constructor The constructor.
         */
        registerType: function() {
            var first = arguments[0];

            if (arguments.length == 1) {
                var id = first[this.typeAttribute] || system.getModuleId(first);
                this.typeMap[id] = first;
            } else {
                this.typeMap[first] = arguments[1];
            }
        },
        /**
         * The default reviver function used during deserialization. By default is detects type properties on objects and uses them to re-construct the correct object using the provided constructor mapping.
         * @method reviver
         * @param {string} key The attribute key.
         * @param {object} value The object value associated with the key.
         * @param {function} getTypeId A custom function used to get the type id from a value.
         * @param {object} getConstructor A custom function used to get the constructor function associated with a type id.
         * @return {object} The value.
         */
        reviver: function(key, value, getTypeId, getConstructor) {
            var typeId = getTypeId(value);
            if (typeId) {
                var ctor = getConstructor(typeId);
                if (ctor) {
                    if (ctor.fromJSON) {
                        return ctor.fromJSON(value);
                    }

                    return new ctor(value);
                }
            }

            return value;
        },
        /**
         * Deserialize the JSON.
         * @method deserialize
         * @param {string} text The JSON string.
         * @param {object} [settings] Settings can specify a reviver, getTypeId function or getConstructor function.
         * @return {object} The deserialized object.
         */
        deserialize: function(text, settings) {
            var that = this;
            settings = settings || {};

            var getTypeId = settings.getTypeId || function(object) { return that.getTypeId(object); };
            var getConstructor = settings.getConstructor || function(id) { return that.typeMap[id]; };
            var reviver = settings.reviver || function(key, value) { return that.reviver(key, value, getTypeId, getConstructor); };

            return JSON.parse(text, reviver);
        }
    };
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * Layers the widget sugar on top of the composition system.
 * @module widget
 * @requires system
 * @requires composition
 * @requires jquery
 * @requires knockout
 */
define('plugins/widget',['durandal/system', 'durandal/composition', 'jquery', 'knockout'], function(system, composition, $, ko) {
    var kindModuleMaps = {},
        kindViewMaps = {},
        bindableSettings = ['model', 'view', 'kind'],
        widgetDataKey = 'durandal-widget-data';

    function extractParts(element, settings){
        var data = ko.utils.domData.get(element, widgetDataKey);

        if(!data){
            data = {
                parts:composition.cloneNodes(ko.virtualElements.childNodes(element))
            };

            ko.virtualElements.emptyNode(element);
            ko.utils.domData.set(element, widgetDataKey, data);
        }

        settings.parts = data.parts;
    }

    /**
     * @class WidgetModule
     * @static
     */
    var widget = {
        getSettings: function(valueAccessor) {
            var settings = ko.utils.unwrapObservable(valueAccessor()) || {};

            if (system.isString(settings)) {
                return { kind: settings };
            }

            for (var attrName in settings) {
                if (ko.utils.arrayIndexOf(bindableSettings, attrName) != -1) {
                    settings[attrName] = ko.utils.unwrapObservable(settings[attrName]);
                } else {
                    settings[attrName] = settings[attrName];
                }
            }

            return settings;
        },
        /**
         * Creates a ko binding handler for the specified kind.
         * @method registerKind
         * @param {string} kind The kind to create a custom binding handler for.
         */
        registerKind: function(kind) {
            ko.bindingHandlers[kind] = {
                init: function() {
                    return { controlsDescendantBindings: true };
                },
                update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    var settings = widget.getSettings(valueAccessor);
                    settings.kind = kind;
                    extractParts(element, settings);
                    widget.create(element, settings, bindingContext, true);
                }
            };

            ko.virtualElements.allowedBindings[kind] = true;
            composition.composeBindings.push(kind + ':');
        },
        /**
         * Maps views and module to the kind identifier if a non-standard pattern is desired.
         * @method mapKind
         * @param {string} kind The kind name.
         * @param {string} [viewId] The unconventional view id to map the kind to.
         * @param {string} [moduleId] The unconventional module id to map the kind to.
         */
        mapKind: function(kind, viewId, moduleId) {
            if (viewId) {
                kindViewMaps[kind] = viewId;
            }

            if (moduleId) {
                kindModuleMaps[kind] = moduleId;
            }
        },
        /**
         * Maps a kind name to it's module id. First it looks up a custom mapped kind, then falls back to `convertKindToModulePath`.
         * @method mapKindToModuleId
         * @param {string} kind The kind name.
         * @return {string} The module id.
         */
        mapKindToModuleId: function(kind) {
            return kindModuleMaps[kind] || widget.convertKindToModulePath(kind);
        },
        /**
         * Converts a kind name to it's module path. Used to conventionally map kinds who aren't explicitly mapped through `mapKind`.
         * @method convertKindToModulePath
         * @param {string} kind The kind name.
         * @return {string} The module path.
         */
        convertKindToModulePath: function(kind) {
            return 'widgets/' + kind + '/viewmodel';
        },
        /**
         * Maps a kind name to it's view id. First it looks up a custom mapped kind, then falls back to `convertKindToViewPath`.
         * @method mapKindToViewId
         * @param {string} kind The kind name.
         * @return {string} The view id.
         */
        mapKindToViewId: function(kind) {
            return kindViewMaps[kind] || widget.convertKindToViewPath(kind);
        },
        /**
         * Converts a kind name to it's view id. Used to conventionally map kinds who aren't explicitly mapped through `mapKind`.
         * @method convertKindToViewPath
         * @param {string} kind The kind name.
         * @return {string} The view id.
         */
        convertKindToViewPath: function(kind) {
            return 'widgets/' + kind + '/view';
        },
        createCompositionSettings: function(element, settings) {
            if (!settings.model) {
                settings.model = this.mapKindToModuleId(settings.kind);
            }

            if (!settings.view) {
                settings.view = this.mapKindToViewId(settings.kind);
            }

            settings.preserveContext = true;
            settings.activate = true;
            settings.activationData = settings;
            settings.mode = 'templated';

            return settings;
        },
        /**
         * Creates a widget.
         * @method create
         * @param {DOMElement} element The DOMElement or knockout virtual element that serves as the target element for the widget.
         * @param {object} settings The widget settings.
         * @param {object} [bindingContext] The current binding context.
         */
        create: function(element, settings, bindingContext, fromBinding) {
            if(!fromBinding){
                settings = widget.getSettings(function() { return settings; }, element);
            }

            var compositionSettings = widget.createCompositionSettings(element, settings);

            composition.compose(element, compositionSettings, bindingContext);
        },
        /**
         * Installs the widget module by adding the widget binding handler and optionally registering kinds.
         * @method install
         * @param {object} config The module config. Add a `kinds` array with the names of widgets to automatically register. You can also specify a `bindingName` if you wish to use another name for the widget binding, such as "control" for example.
         */
        install:function(config){
            config.bindingName = config.bindingName || 'widget';

            if(config.kinds){
                var toRegister = config.kinds;

                for(var i = 0; i < toRegister.length; i++){
                    widget.registerKind(toRegister[i]);
                }
            }

            ko.bindingHandlers[config.bindingName] = {
                init: function() {
                    return { controlsDescendantBindings: true };
                },
                update: function(element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
                    var settings = widget.getSettings(valueAccessor);
                    extractParts(element, settings);
                    widget.create(element, settings, bindingContext, true);
                }
            };

            composition.composeBindings.push(config.bindingName + ':');
            ko.virtualElements.allowedBindings[config.bindingName] = true;
        }
    };

    return widget;
});

/**
 * Durandal 2.0.1 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The entrance transition module.
 * @module entrance
 * @requires system
 * @requires composition
 * @requires jquery
 */
define('transitions/entrance',['durandal/system', 'durandal/composition', 'jquery'], function(system, composition, $) {
    var fadeOutDuration = 100;
    var endValues = {
        marginRight: 0,
        marginLeft: 0,
        opacity: 1
    };
    var clearValues = {
        marginLeft: '',
        marginRight: '',
        opacity: '',
        display: ''
    };

    /**
     * @class EntranceModule
     * @constructor
     */
    var entrance = function(context) {
        return system.defer(function(dfd) {
            function endTransition() {
                dfd.resolve();
            }

            function scrollIfNeeded() {
                if (!context.keepScrollPosition) {
                    $(document).scrollTop(0);
                }
            }

            if (!context.child) {
                $(context.activeView).fadeOut(fadeOutDuration, endTransition);
            } else {
                var duration = context.duration || 500;
                var fadeOnly = !!context.fadeOnly;

                function startTransition() {
                    scrollIfNeeded();
                    context.triggerAttach();

                    var startValues = {
                        marginLeft: fadeOnly ? '0' : '20px',
                        marginRight: fadeOnly ? '0' : '-20px',
                        opacity: 0,
                        display: 'block'
                    };

                    var $child = $(context.child);

                    $child.css(startValues);
                    $child.animate(endValues, {
                        duration: duration,
                        easing: 'swing',
                        always: function () {
                            $child.css(clearValues);
                            endTransition();
                        }
                    });
                }

                if (context.activeView) {
                    $(context.activeView).fadeOut({ duration: fadeOutDuration, always: startTransition });
                } else {
                    startTransition();
                }
            }
        }).promise();
    };

    return entrance;
});

/**
 * Durandal 2.0.0 Copyright (c) 2012 Blue Spire Consulting, Inc. All Rights Reserved.
 * Available via the MIT license.
 * see: http://durandaljs.com or https://github.com/BlueSpire/Durandal for details.
 */
/**
 * The entrance transition module.
 * @module entrance
 * @requires system
 * @requires composition
 * @requires jquery
 */
define('transitions/scrollers',['durandal/system', 'durandal/composition', 'jquery'], function (system, composition, $) {
    /**
	 * @class EntranceModule
	 * @constructor
	 */
    var scrollers = function (context) {
        return system.defer(function (dfd) {
            function endTransition() {
                dfd.resolve();
            }

            function scrollIfNeeded() {
                if (!context.keepScrollPosition) {
                    $(document).scrollTop(0);
                }
            }

            if (!context.child) {
                $(context.activeView).hide(0, endTransition);
            } else {
                function startTransition() {
                    scrollIfNeeded();
                    context.triggerAttach();

                    var $child = $(context.child);

                    $child.show(0, endTransition);
                }

                if (context.activeView) {
                    $(context.activeView).hide(0, startTransition);
                } else {
                    startTransition();
                }
            }
        }).promise();
    };

    return scrollers;
});

require(["main"]);
}());