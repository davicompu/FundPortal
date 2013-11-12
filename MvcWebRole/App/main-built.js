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

define('datamodels/area.model',[],function(){function e(e){var t=this;e=e||{},t.Id=e.Id,t.Number=e.Number,t.Name=e.Name,t.errorMessage=ko.observable(),t.toJson=function(){return ko.toJSON(t)}}var t={Item:e};return t});
define('services/contexthelper',[],function(){function e(e){e.errorMessage(null)}function t(e,t,n,r){var i={dataType:r||"json",contentType:"application/json",cache:!1,type:e,data:n?n.toJson():null},o=$("#antiForgeryToken").val();return o&&(i.headers={RequestVerificationToken:o}),$.ajax(t,i)}var n={clearErrorMessage:e,ajaxRequest:t};return n});
define('datacontexts/area.datacontext',["datamodels/area.model","services/contexthelper"],function(e,t){function n(t){return new e.Item(t)}function r(e,r,u){function o(e){r(new n(e))}function a(e){r(void 0),u("An error occurred during your request: "+e.statusText)}return t.ajaxRequest("get",c("get",e)).done(o).fail(a)}function u(e,r,u,o,a){function i(t){var r=$.map(t,function(e){return new n(e)});e(r),$.each(a||[],function(e,t){t(r)})}function s(t){e(void 0),r("An error occurred during your request: "+t.statusText)}return t.ajaxRequest("get",c(u),o).done(i).fail(s)}function o(e,n){function r(e){$.each(n||[],function(t,n){n(e)})}function u(t){e.errorMessage("Error adding the new item: "+t.statusText)}return t.clearErrorMessage(e),t.ajaxRequest("post",c("post"),e).done(r).fail(u)}function a(e,n){function r(e){$.each(n||[],function(t,n){n(e)})}function u(t){e.errorMessage("Error updating the item: "+t.statusText)}return t.clearErrorMessage(e),t.ajaxRequest("put",c("put",e.Id),e).done(r).fail(u)}function i(e,n){function r(){$.each(n||[],function(e,t){t()})}function u(t){e.errorMessage("Error deleting the item: "+t.statusText)}return t.clearErrorMessage(e),t.ajaxRequest("delete",c("delete",e.Id)).done(r).fail(u)}function c(e,t){return"/api/area/"+e+"/"+(t||"")}var s={createItem:n,getItem:r,getItems:u,saveNewItem:o,saveChangedItem:a,deleteItem:i};return s});
define('datamodels/fileupload.model',[],function(){function e(e){var t=this;e=e||{},t.Id=e.Id,t.DateTimeCreated=e.DateTimeCreated||new Date,t.Source=e.Source,t.ContentType=e.ContentType,t.OriginalFileName=e.OriginalFileName,t.errorMessage=ko.observable(e.Message),t.destroy=ko.observable(!1),t.toJson=function(){return ko.toJSON(t)}}var t={Item:e};return t});
define('datacontexts/fileupload.datacontext',["datamodels/fileupload.model","services/contexthelper"],function(e,t){function n(t){return new e.Item(t)}function r(e,n,r){t.clearErrorMessage(e);for(var a,i=n.target.files,s=new FormData,c=o("post"),f=0;a=i[f];++f){var s=new FormData;s.append(a.name,a),u(s,c,r)}}function a(e,n,r){function a(){$.each(r||[],function(e,t){t()})}function u(t){e.errorMessage("Error deleting the item: "+t.statusText)}return t.clearErrorMessage(e),t.ajaxRequest("delete",o("delete",e.Id)).done(a).fail(u)}function o(e,t){return"/api/fileupload/"+e+"/"+(t||"")}function u(e,t,r){var a=new XMLHttpRequest;a.open("post",t,!0),a.onload=function(){var e=JSON.parse(a.response);r.push(n(e))},a.send(e)}var i={createItem:n,saveNewItem:r,deleteItem:a};return i});
define('datamodels/fund.model',["datacontexts/fileupload.datacontext"],function(e){function t(e){var t=this;e=e||{},t.Id=e.Id,t.AreaId=e.AreaId,t.Number=e.Number,t.DateTimeCreated=e.DateTimeCreated||new Date,t.DateTimeEdited=e.DateTimeEdited||[],t.Title=e.Title,t.Status=e.Status,t.Description=e.Description,t.ResponsiblePerson=e.ResponsiblePerson,t.CurrentBudget=ko.observable(e.CurrentBudget||0),t.ProjectedExpenditures=ko.observable(e.ProjectedExpenditures||0),t.BudgetAdjustment=ko.observable(e.BudgetAdjustment||0),t.BudgetAdjustmentNote=e.BudgetAdjustmentNote,t.FiscalYear=e.FiscalYear,t.FileUploads=r(t,e.FileUploads),t.errorMessage=ko.observable(),t.requestedBudget=ko.computed(function(){return parseFloat(t.CurrentBudget())+parseFloat(t.BudgetAdjustment())}),t.projectedYearEndBalance=ko.computed(function(){return t.CurrentBudget()-t.ProjectedExpenditures()}),t.variance=ko.computed(function(){return t.CurrentBudget()-t.requestedBudget()}),t.statusText=ko.computed(function(){switch(t.Status){case 1:return"Draft";case 2:return"Final";default:return"Status error"}}),t.toJson=function(){return ko.toJSON(t)}}function r(t,r){var n=ko.observableArray([]);return r&&$.each(r,function(t,r){n.push(e.createItem(r))}),n}var n={Item:t};return n});
define('datacontexts/fund.datacontext',["datamodels/fund.model","services/contexthelper"],function(e,t){function n(t){return new e.Item(t)}function r(e,r,o){function u(e){r(new n(e))}function a(e){r(void 0),o("An error occurred during your request: "+e.statusText)}return t.ajaxRequest("get",s("get",e)).done(u).fail(a)}function o(e,t,r,o,u){function a(t){var r=$.map(t,function(e){return new n(e)});e(r),$.each(u||[],function(e,t){t(r)})}function i(n){e(void 0),t("An error occurred during your request: "+n.statusText)}return $.getJSON(s(r),o).done(a).fail(i)}function u(e,n){function r(e){$.each(n||[],function(t,n){n(e)})}function o(t){e.errorMessage("Error adding the new item: "+t.statusText)}return t.clearErrorMessage(e),t.ajaxRequest("post",s("post"),e).done(r).fail(o)}function a(e,n){function r(e){$.each(n||[],function(t,n){n(e)})}function o(t){e.errorMessage("Error updating the item: "+t.statusText)}return t.clearErrorMessage(e),t.ajaxRequest("put",s("put",e.Id),e).done(r).fail(o)}function i(e,n,r){function o(){$.each(r||[],function(e,t){t()})}function u(t){e.errorMessage("Error deleting the item: "+t.statusText)}return t.clearErrorMessage(e),t.ajaxRequest("delete",s("delete",e.Id)).done(o).fail(u)}function s(e,t){return"/api/fund/"+e+"/"+(t||"")}var c={createItem:n,getItem:r,getItems:o,saveNewItem:u,saveChangedItem:a,deleteItem:i};return c});
define('durandal/system',["require","jquery"],function(e,t){function n(e){var t="[object "+e+"]";r["is"+e]=function(e){return s.call(e)==t}}var r,i=!1,o=Object.keys,a=Object.prototype.hasOwnProperty,s=Object.prototype.toString,u=!1,c=Array.isArray,l=Array.prototype.slice;if(Function.prototype.bind&&("object"==typeof console||"function"==typeof console)&&"object"==typeof console.log)try{["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach(function(e){console[e]=this.call(console[e],console)},Function.prototype.bind)}catch(d){u=!0}e.on&&e.on("moduleLoaded",function(e,t){r.setModuleId(e,t)}),"undefined"!=typeof requirejs&&(requirejs.onResourceLoad=function(e,t){r.setModuleId(e.defined[t.id],t.id)});var f=function(){},v=function(){try{if("undefined"!=typeof console&&"function"==typeof console.log)if(window.opera)for(var e=0;e<arguments.length;)console.log("Item "+(e+1)+": "+arguments[e]),e++;else 1==l.call(arguments).length&&"string"==typeof l.call(arguments)[0]?console.log(l.call(arguments).toString()):console.log.apply(console,l.call(arguments));else Function.prototype.bind&&!u||"undefined"==typeof console||"object"!=typeof console.log||Function.prototype.call.call(console.log,console,l.call(arguments))}catch(t){}},g=function(e){if(e instanceof Error)throw e;throw new Error(e)};r={version:"2.0.1",noop:f,getModuleId:function(e){return e?"function"==typeof e?e.prototype.__moduleId__:"string"==typeof e?null:e.__moduleId__:null},setModuleId:function(e,t){return e?"function"==typeof e?(e.prototype.__moduleId__=t,void 0):("string"!=typeof e&&(e.__moduleId__=t),void 0):void 0},resolveObject:function(e){return r.isFunction(e)?new e:e},debug:function(e){return 1==arguments.length&&(i=e,i?(this.log=v,this.error=g,this.log("Debug:Enabled")):(this.log("Debug:Disabled"),this.log=f,this.error=f)),i},log:f,error:f,assert:function(e,t){e||r.error(new Error(t||"Assert:Failed"))},defer:function(e){return t.Deferred(e)},guid:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){var t=0|16*Math.random(),n="x"==e?t:8|3&t;return n.toString(16)})},acquire:function(){var t,n=arguments[0],i=!1;return r.isArray(n)?(t=n,i=!0):t=l.call(arguments,0),this.defer(function(n){e(t,function(){var e=arguments;setTimeout(function(){e.length>1||i?n.resolve(l.call(e,0)):n.resolve(e[0])},1)},function(e){n.reject(e)})}).promise()},extend:function(e){for(var t=l.call(arguments,1),n=0;n<t.length;n++){var r=t[n];if(r)for(var i in r)e[i]=r[i]}return e},wait:function(e){return r.defer(function(t){setTimeout(t.resolve,e)}).promise()}},r.keys=o||function(e){if(e!==Object(e))throw new TypeError("Invalid object");var t=[];for(var n in e)a.call(e,n)&&(t[t.length]=n);return t},r.isElement=function(e){return!(!e||1!==e.nodeType)},r.isArray=c||function(e){return"[object Array]"==s.call(e)},r.isObject=function(e){return e===Object(e)},r.isBoolean=function(e){return"boolean"==typeof e},r.isPromise=function(e){return e&&r.isFunction(e.then)};for(var p=["Arguments","Function","String","Number","Date","RegExp"],m=0;m<p.length;m++)n(p[m]);return r});
define('durandal/viewEngine',["durandal/system","jquery"],function(e,t){var n;return n=t.parseHTML?function(e){return t.parseHTML(e)}:function(e){return t(e).get()},{viewExtension:".html",viewPlugin:"text",isViewUrl:function(e){return-1!==e.indexOf(this.viewExtension,e.length-this.viewExtension.length)},convertViewUrlToViewId:function(e){return e.substring(0,e.length-this.viewExtension.length)},convertViewIdToRequirePath:function(e){return this.viewPlugin+"!"+e+this.viewExtension},parseMarkup:n,processMarkup:function(e){var t=this.parseMarkup(e);return this.ensureSingleElement(t)},ensureSingleElement:function(e){if(1==e.length)return e[0];for(var n=[],r=0;r<e.length;r++){var i=e[r];if(8!=i.nodeType){if(3==i.nodeType){var o=/\S/.test(i.nodeValue);if(!o)continue}n.push(i)}}return n.length>1?t(n).wrapAll('<div class="durandal-wrapper"></div>').parent().get(0):n[0]},createView:function(t){var n=this,r=this.convertViewIdToRequirePath(t);return e.defer(function(i){e.acquire(r).then(function(e){var r=n.processMarkup(e);r.setAttribute("data-view",t),i.resolve(r)}).fail(function(e){n.createFallbackView(t,r,e).then(function(e){e.setAttribute("data-view",t),i.resolve(e)})})}).promise()},createFallbackView:function(t,n){var r=this,i='View Not Found. Searched for "'+t+'" via path "'+n+'".';return e.defer(function(e){e.resolve(r.processMarkup('<div class="durandal-view-404">'+i+"</div>"))}).promise()}}});
define('durandal/viewLocator',["durandal/system","durandal/viewEngine"],function(e,t){function n(e,t){for(var n=0;n<e.length;n++){var r=e[n],i=r.getAttribute("data-view");if(i==t)return r}}function r(e){return(e+"").replace(/([\\\.\+\*\?\[\^\]\$\(\)\{\}\=\!\<\>\|\:])/g,"\\$1")}return{useConvention:function(e,t,n){e=e||"viewmodels",t=t||"views",n=n||t;var i=new RegExp(r(e),"gi");this.convertModuleIdToViewId=function(e){return e.replace(i,t)},this.translateViewIdToArea=function(e,t){return t&&"partial"!=t?n+"/"+t+"/"+e:n+"/"+e}},locateViewForObject:function(t,n,r){var i;if(t.getView&&(i=t.getView()))return this.locateView(i,n,r);if(t.viewUrl)return this.locateView(t.viewUrl,n,r);var o=e.getModuleId(t);return o?this.locateView(this.convertModuleIdToViewId(o),n,r):this.locateView(this.determineFallbackViewId(t),n,r)},convertModuleIdToViewId:function(e){return e},determineFallbackViewId:function(e){var t=/function (.{1,})\(/,n=t.exec(e.constructor.toString()),r=n&&n.length>1?n[1]:"";return"views/"+r},translateViewIdToArea:function(e){return e},locateView:function(r,i,o){if("string"==typeof r){var a;if(a=t.isViewUrl(r)?t.convertViewUrlToViewId(r):r,i&&(a=this.translateViewIdToArea(a,i)),o){var s=n(o,a);if(s)return e.defer(function(e){e.resolve(s)}).promise()}return t.createView(a)}return e.defer(function(e){e.resolve(r)}).promise()}}});
define('durandal/binder',["durandal/system","knockout"],function(e,t){function n(t){return void 0===t?{applyBindings:!0}:e.isBoolean(t)?{applyBindings:t}:(void 0===t.applyBindings&&(t.applyBindings=!0),t)}function r(r,c,l,d){if(!c||!l)return i.throwOnErrors?e.error(o):e.log(o,c,d),void 0;if(!c.getAttribute)return i.throwOnErrors?e.error(a):e.log(a,c,d),void 0;var f=c.getAttribute("data-view");try{var v;return r&&r.binding&&(v=r.binding(c)),v=n(v),i.binding(d,c,v),v.applyBindings?(e.log("Binding",f,d),t.applyBindings(l,c)):r&&t.utils.domData.set(c,u,{$data:r}),i.bindingComplete(d,c,v),r&&r.bindingComplete&&r.bindingComplete(c),t.utils.domData.set(c,s,v),v}catch(g){g.message=g.message+";\nView: "+f+";\nModuleId: "+e.getModuleId(d),i.throwOnErrors?e.error(g):e.log(g.message)}}var i,o="Insufficient Information to Bind",a="Unexpected View Type",s="durandal-binding-instruction",u="__ko_bindingContext__";return i={binding:e.noop,bindingComplete:e.noop,throwOnErrors:!1,getBindingInstruction:function(e){return t.utils.domData.get(e,s)},bindContext:function(e,t,n){return n&&e&&(e=e.createChildContext(n)),r(n,t,e,n||(e?e.$data:null))},bind:function(e,t){return r(e,t,e,e)}}});
define('durandal/activator',["durandal/system","knockout"],function(e,t){function n(e){return void 0==e&&(e={}),e.closeOnDeactivate||(e.closeOnDeactivate=c.defaults.closeOnDeactivate),e.beforeActivate||(e.beforeActivate=c.defaults.beforeActivate),e.afterDeactivate||(e.afterDeactivate=c.defaults.afterDeactivate),e.affirmations||(e.affirmations=c.defaults.affirmations),e.interpretResponse||(e.interpretResponse=c.defaults.interpretResponse),e.areSameItem||(e.areSameItem=c.defaults.areSameItem),e}function r(t,n,r){return e.isArray(r)?t[n].apply(t,r):t[n](r)}function i(t,n,r,i,o){if(t&&t.deactivate){e.log("Deactivating",t);var a;try{a=t.deactivate(n)}catch(s){return e.error(s),i.resolve(!1),void 0}a&&a.then?a.then(function(){r.afterDeactivate(t,n,o),i.resolve(!0)},function(t){e.log(t),i.resolve(!1)}):(r.afterDeactivate(t,n,o),i.resolve(!0))}else t&&r.afterDeactivate(t,n,o),i.resolve(!0)}function o(t,n,i,o){if(t)if(t.activate){e.log("Activating",t);var a;try{a=r(t,"activate",o)}catch(s){return e.error(s),i(!1),void 0}a&&a.then?a.then(function(){n(t),i(!0)},function(t){e.log(t),i(!1)}):(n(t),i(!0))}else n(t),i(!0);else i(!0)}function a(t,n,r){return r.lifecycleData=null,e.defer(function(i){if(t&&t.canDeactivate){var o;try{o=t.canDeactivate(n)}catch(a){return e.error(a),i.resolve(!1),void 0}o.then?o.then(function(e){r.lifecycleData=e,i.resolve(r.interpretResponse(e))},function(t){e.error(t),i.resolve(!1)}):(r.lifecycleData=o,i.resolve(r.interpretResponse(o)))}else i.resolve(!0)}).promise()}function s(t,n,i,o){return i.lifecycleData=null,e.defer(function(a){if(t==n())return a.resolve(!0),void 0;if(t&&t.canActivate){var s;try{s=r(t,"canActivate",o)}catch(u){return e.error(u),a.resolve(!1),void 0}s.then?s.then(function(e){i.lifecycleData=e,a.resolve(i.interpretResponse(e))},function(t){e.error(t),a.resolve(!1)}):(i.lifecycleData=s,a.resolve(i.interpretResponse(s)))}else a.resolve(!0)}).promise()}function u(r,u){var c,l=t.observable(null);u=n(u);var d=t.computed({read:function(){return l()},write:function(e){d.viaSetter=!0,d.activateItem(e)}});return d.__activator__=!0,d.settings=u,u.activator=d,d.isActivating=t.observable(!1),d.canDeactivateItem=function(e,t){return a(e,t,u)},d.deactivateItem=function(t,n){return e.defer(function(e){d.canDeactivateItem(t,n).then(function(r){r?i(t,n,u,e,l):(d.notifySubscribers(),e.resolve(!1))})}).promise()},d.canActivateItem=function(e,t){return s(e,l,u,t)},d.activateItem=function(t,n){var r=d.viaSetter;return d.viaSetter=!1,e.defer(function(a){if(d.isActivating())return a.resolve(!1),void 0;d.isActivating(!0);var s=l();return u.areSameItem(s,t,c,n)?(d.isActivating(!1),a.resolve(!0),void 0):(d.canDeactivateItem(s,u.closeOnDeactivate).then(function(f){f?d.canActivateItem(t,n).then(function(f){f?e.defer(function(e){i(s,u.closeOnDeactivate,u,e)}).promise().then(function(){t=u.beforeActivate(t,n),o(t,l,function(e){c=n,d.isActivating(!1),a.resolve(e)},n)}):(r&&d.notifySubscribers(),d.isActivating(!1),a.resolve(!1))}):(r&&d.notifySubscribers(),d.isActivating(!1),a.resolve(!1))}),void 0)}).promise()},d.canActivate=function(){var e;return r?(e=r,r=!1):e=d(),d.canActivateItem(e)},d.activate=function(){var e;return r?(e=r,r=!1):e=d(),d.activateItem(e)},d.canDeactivate=function(e){return d.canDeactivateItem(d(),e)},d.deactivate=function(e){return d.deactivateItem(d(),e)},d.includeIn=function(e){e.canActivate=function(){return d.canActivate()},e.activate=function(){return d.activate()},e.canDeactivate=function(e){return d.canDeactivate(e)},e.deactivate=function(e){return d.deactivate(e)}},u.includeIn?d.includeIn(u.includeIn):r&&d.activate(),d.forItems=function(t){u.closeOnDeactivate=!1,u.determineNextItemToActivate=function(e,t){var n=t-1;return-1==n&&e.length>1?e[1]:n>-1&&n<e.length-1?e[n]:null},u.beforeActivate=function(e){var n=d();if(e){var r=t.indexOf(e);-1==r?t.push(e):e=t()[r]}else e=u.determineNextItemToActivate(t,n?t.indexOf(n):0);return e},u.afterDeactivate=function(e,n){n&&t.remove(e)};var n=d.canDeactivate;d.canDeactivate=function(r){return r?e.defer(function(e){function n(){for(var t=0;t<o.length;t++)if(!o[t])return e.resolve(!1),void 0;e.resolve(!0)}for(var i=t(),o=[],a=0;a<i.length;a++)d.canDeactivateItem(i[a],r).then(function(e){o.push(e),o.length==i.length&&n()})}).promise():n()};var r=d.deactivate;return d.deactivate=function(n){return n?e.defer(function(e){function r(r){d.deactivateItem(r,n).then(function(){o++,t.remove(r),o==a&&e.resolve()})}for(var i=t(),o=0,a=i.length,s=0;a>s;s++)r(i[s])}).promise():r()},d},d}var c,l={closeOnDeactivate:!0,affirmations:["yes","ok","true"],interpretResponse:function(n){return e.isObject(n)&&(n=n.can||!1),e.isString(n)?-1!==t.utils.arrayIndexOf(this.affirmations,n.toLowerCase()):n},areSameItem:function(e,t){return e==t},beforeActivate:function(e){return e},afterDeactivate:function(e,t,n){t&&n&&n(null)}};return c={defaults:l,create:u,isActivator:function(e){return e&&e.__activator__}}});
define('durandal/composition',["durandal/system","durandal/viewLocator","durandal/binder","durandal/viewEngine","durandal/activator","jquery","knockout"],function(e,t,n,r,i,o,a){function s(e){for(var t=[],n={childElements:t,activeView:null},r=a.virtualElements.firstChild(e);r;)1==r.nodeType&&(t.push(r),r.getAttribute(I)&&(n.activeView=r)),r=a.virtualElements.nextSibling(r);return n.activeView||(n.activeView=t[0]),n}function u(){A--,0===A&&setTimeout(function(){for(var t=x.length;t--;)try{x[t]()}catch(n){e.error(n)}x=[]},1)}function c(e){delete e.activeView,delete e.viewElements}function l(t,n,r){if(r)n();else if(t.activate&&t.model&&t.model.activate){var i;try{i=e.isArray(t.activationData)?t.model.activate.apply(t.model,t.activationData):t.model.activate(t.activationData),i&&i.then?i.then(n,function(t){e.error(t),n()}):i||void 0===i?n():(u(),c(t))}catch(o){e.error(o)}}else n()}function d(){var t=this;if(t.activeView&&t.activeView.removeAttribute(I),t.child)try{t.model&&t.model.attached&&(t.composingNewView||t.alwaysTriggerAttach)&&t.model.attached(t.child,t.parent,t),t.attached&&t.attached(t.child,t.parent,t),t.child.setAttribute(I,!0),t.composingNewView&&t.model&&t.model.detached&&a.utils.domNodeDisposal.addDisposeCallback(t.child,function(){try{t.model.detached(t.child,t.parent,t)}catch(n){e.error(n)}})}catch(n){e.error(n)}t.triggerAttach=e.noop}function f(t){if(e.isString(t.transition)){if(t.activeView){if(t.activeView==t.child)return!1;if(!t.child)return!0;if(t.skipTransitionOnSameViewId){var n=t.activeView.getAttribute("data-view"),r=t.child.getAttribute("data-view");return n!=r}}return!0}return!1}function v(e){for(var t=0,n=e.length,r=[];n>t;t++){var i=e[t].cloneNode(!0);r.push(i)}return r}function g(e){var t=v(e.parts),n=w.getParts(t,null,!0),r=w.getParts(e.child);for(var i in n)o(r[i]).replaceWith(n[i])}function m(t){var n,r,i=a.virtualElements.childNodes(t.parent);if(!e.isArray(i)){var o=[];for(n=0,r=i.length;r>n;n++)o[n]=i[n];i=o}for(n=1,r=i.length;r>n;n++)a.removeNode(i[n])}function p(e){a.utils.domData.set(e,T,e.style.display),e.style.display="none"}function h(e){e.style.display=a.utils.domData.get(e,T)}function b(e){var t=e.getAttribute("data-bind");if(!t)return!1;for(var n=0,r=E.length;r>n;n++)if(t.indexOf(E[n])>-1)return!0;return!1}var w,y={},I="data-active-view",x=[],A=0,S="durandal-composition-data",k="data-part",D=["model","view","transition","area","strategy","activationData"],T="durandal-visibility-data",E=["compose:"],N={complete:function(e){x.push(e)}};return w={composeBindings:E,convertTransitionToModuleId:function(e){return"transitions/"+e},defaultTransitionName:null,current:N,addBindingHandler:function(e,t,n){var r,i,o="composition-handler-"+e;t=t||a.bindingHandlers[e],n=n||function(){return void 0},i=a.bindingHandlers[e]={init:function(e,r,i,s,u){if(A>0){var c={trigger:a.observable(null)};w.current.complete(function(){t.init&&t.init(e,r,i,s,u),t.update&&(a.utils.domData.set(e,o,t),c.trigger("trigger"))}),a.utils.domData.set(e,o,c)}else a.utils.domData.set(e,o,t),t.init&&t.init(e,r,i,s,u);return n(e,r,i,s,u)},update:function(e,t,n,r,i){var s=a.utils.domData.get(e,o);return s.update?s.update(e,t,n,r,i):(s.trigger&&s.trigger(),void 0)}};for(r in t)"init"!==r&&"update"!==r&&(i[r]=t[r])},getParts:function(e,t,n){if(t=t||{},!e)return t;void 0===e.length&&(e=[e]);for(var r=0,i=e.length;i>r;r++){var o=e[r];if(o.getAttribute){if(!n&&b(o))continue;var a=o.getAttribute(k);a&&(t[a]=o),!n&&o.hasChildNodes()&&w.getParts(o.childNodes,t)}}return t},cloneNodes:v,finalize:function(t){if(void 0===t.transition&&(t.transition=this.defaultTransitionName),t.child||t.activeView)if(f(t)){var r=this.convertTransitionToModuleId(t.transition);e.acquire(r).then(function(e){t.transition=e,e(t).then(function(){if(t.cacheViews){if(t.activeView){var e=n.getBindingInstruction(t.activeView);e&&void 0!=e.cacheViews&&!e.cacheViews&&a.removeNode(t.activeView)}}else t.child?m(t):a.virtualElements.emptyNode(t.parent);t.triggerAttach(),u(),c(t)})}).fail(function(t){e.error("Failed to load transition ("+r+"). Details: "+t.message)})}else{if(t.child!=t.activeView){if(t.cacheViews&&t.activeView){var i=n.getBindingInstruction(t.activeView);!i||void 0!=i.cacheViews&&!i.cacheViews?a.removeNode(t.activeView):p(t.activeView)}t.child?(t.cacheViews||m(t),h(t.child)):t.cacheViews||a.virtualElements.emptyNode(t.parent)}t.triggerAttach(),u(),c(t)}else t.cacheViews||a.virtualElements.emptyNode(t.parent),t.triggerAttach(),u(),c(t)},bindAndShow:function(e,t,i){t.child=e,t.composingNewView=t.cacheViews?-1==a.utils.arrayIndexOf(t.viewElements,e):!0,l(t,function(){if(t.binding&&t.binding(t.child,t.parent,t),t.preserveContext&&t.bindingContext)t.composingNewView&&(t.parts&&g(t),p(e),a.virtualElements.prepend(t.parent,e),n.bindContext(t.bindingContext,e,t.model));else if(e){var i=t.model||y,o=a.dataFor(e);if(o!=i){if(!t.composingNewView)return a.removeNode(e),r.createView(e.getAttribute("data-view")).then(function(e){w.bindAndShow(e,t,!0)}),void 0;t.parts&&g(t),p(e),a.virtualElements.prepend(t.parent,e),n.bind(i,e)}}w.finalize(t)},i)},defaultStrategy:function(e){return t.locateViewForObject(e.model,e.area,e.viewElements)},getSettings:function(t){var n,o=t(),s=a.utils.unwrapObservable(o)||{},u=i.isActivator(o);if(e.isString(s))return s=r.isViewUrl(s)?{view:s}:{model:s,activate:!0};if(n=e.getModuleId(s))return s={model:s,activate:!0};!u&&s.model&&(u=i.isActivator(s.model));for(var c in s)s[c]=-1!=a.utils.arrayIndexOf(D,c)?a.utils.unwrapObservable(s[c]):s[c];return u?s.activate=!1:void 0===s.activate&&(s.activate=!0),s},executeStrategy:function(e){e.strategy(e).then(function(t){w.bindAndShow(t,e)})},inject:function(n){return n.model?n.view?(t.locateView(n.view,n.area,n.viewElements).then(function(e){w.bindAndShow(e,n)}),void 0):(n.strategy||(n.strategy=this.defaultStrategy),e.isString(n.strategy)?e.acquire(n.strategy).then(function(e){n.strategy=e,w.executeStrategy(n)}).fail(function(t){e.error("Failed to load view strategy ("+n.strategy+"). Details: "+t.message)}):this.executeStrategy(n),void 0):(this.bindAndShow(null,n),void 0)},compose:function(n,r,i,o){A++,o||(r=w.getSettings(function(){return r},n)),r.compositionComplete&&x.push(function(){r.compositionComplete(r.child,r.parent,r)}),x.push(function(){r.composingNewView&&r.model&&r.model.compositionComplete&&r.model.compositionComplete(r.child,r.parent,r)});var a=s(n);r.activeView=a.activeView,r.parent=n,r.triggerAttach=d,r.bindingContext=i,r.cacheViews&&!r.viewElements&&(r.viewElements=a.childElements),r.model?e.isString(r.model)?e.acquire(r.model).then(function(t){r.model=e.resolveObject(t),w.inject(r)}).fail(function(t){e.error("Failed to load composed module ("+r.model+"). Details: "+t.message)}):w.inject(r):r.view?(r.area=r.area||"partial",r.preserveContext=!0,t.locateView(r.view,r.area,r.viewElements).then(function(e){w.bindAndShow(e,r)})):this.bindAndShow(null,r)}},a.bindingHandlers.compose={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,i,o){var s=w.getSettings(t,e);if(s.mode){var u=a.utils.domData.get(e,S);if(!u){var c=a.virtualElements.childNodes(e);u={},"inline"===s.mode?u.view=r.ensureSingleElement(c):"templated"===s.mode&&(u.parts=v(c)),a.virtualElements.emptyNode(e),a.utils.domData.set(e,S,u)}"inline"===s.mode?s.view=u.view.cloneNode(!0):"templated"===s.mode&&(s.parts=u.parts),s.preserveContext=!0}w.compose(e,s,o,!0)}},a.virtualElements.allowedBindings.compose=!0,w});
define('durandal/events',["durandal/system"],function(e){var t=/\s+/,n=function(){},r=function(e,t){this.owner=e,this.events=t};return r.prototype.then=function(e,t){return this.callback=e||this.callback,this.context=t||this.context,this.callback?(this.owner.on(this.events,this.callback,this.context),this):this},r.prototype.on=r.prototype.then,r.prototype.off=function(){return this.owner.off(this.events,this.callback,this.context),this},n.prototype.on=function(e,n,i){var o,a,s;if(n){for(o=this.callbacks||(this.callbacks={}),e=e.split(t);a=e.shift();)s=o[a]||(o[a]=[]),s.push(n,i);return this}return new r(this,e)},n.prototype.off=function(n,r,i){var o,a,s,u;if(!(a=this.callbacks))return this;if(!(n||r||i))return delete this.callbacks,this;for(n=n?n.split(t):e.keys(a);o=n.shift();)if((s=a[o])&&(r||i))for(u=s.length-2;u>=0;u-=2)r&&s[u]!==r||i&&s[u+1]!==i||s.splice(u,2);else delete a[o];return this},n.prototype.trigger=function(e){var n,r,i,o,a,s,u,c;if(!(r=this.callbacks))return this;for(c=[],e=e.split(t),o=1,a=arguments.length;a>o;o++)c[o-1]=arguments[o];for(;n=e.shift();){if((u=r.all)&&(u=u.slice()),(i=r[n])&&(i=i.slice()),i)for(o=0,a=i.length;a>o;o+=2)i[o].apply(i[o+1]||this,c);if(u)for(s=[n].concat(c),o=0,a=u.length;a>o;o+=2)u[o].apply(u[o+1]||this,s)}return this},n.prototype.proxy=function(e){var t=this;return function(n){t.trigger(e,n)}},n.includeIn=function(e){e.on=n.prototype.on,e.off=n.prototype.off,e.trigger=n.prototype.trigger,e.proxy=n.prototype.proxy},n});
define('durandal/app',["durandal/system","durandal/viewEngine","durandal/composition","durandal/events","jquery"],function(e,t,n,r,i){function o(){return e.defer(function(t){return 0==s.length?(t.resolve(),void 0):(e.acquire(s).then(function(n){for(var r=0;r<n.length;r++){var i=n[r];if(i.install){var o=u[r];e.isObject(o)||(o={}),i.install(o),e.log("Plugin:Installed "+s[r])}else e.log("Plugin:Loaded "+s[r])}t.resolve()}).fail(function(t){e.error("Failed to load plugin(s). Details: "+t.message)}),void 0)}).promise()}var a,s=[],u=[];return a={title:"Application",configurePlugins:function(t,n){var r=e.keys(t);n=n||"plugins/",-1===n.indexOf("/",n.length-1)&&(n+="/");for(var i=0;i<r.length;i++){var o=r[i];s.push(n+o),u.push(t[o])}},start:function(){return e.log("Application:Starting"),this.title&&(document.title=this.title),e.defer(function(t){i(function(){o().then(function(){t.resolve(),e.log("Application:Started")})})}).promise()},setRoot:function(r,i,o){var a,s={activate:!0,transition:i};a=!o||e.isString(o)?document.getElementById(o||"applicationHost"):o,e.isString(r)?t.isViewUrl(r)?s.view=r:s.model=r:s.model=r,n.compose(a,s)}},r.includeIn(a),a});
define('services/../../Scripts/durandal/system',["require","jquery"],function(e,t){function n(e){var t="[object "+e+"]";r["is"+e]=function(e){return s.call(e)==t}}var r,i=!1,o=Object.keys,a=Object.prototype.hasOwnProperty,s=Object.prototype.toString,u=!1,c=Array.isArray,l=Array.prototype.slice;if(Function.prototype.bind&&("object"==typeof console||"function"==typeof console)&&"object"==typeof console.log)try{["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach(function(e){console[e]=this.call(console[e],console)},Function.prototype.bind)}catch(d){u=!0}e.on&&e.on("moduleLoaded",function(e,t){r.setModuleId(e,t)}),"undefined"!=typeof requirejs&&(requirejs.onResourceLoad=function(e,t){r.setModuleId(e.defined[t.id],t.id)});var f=function(){},v=function(){try{if("undefined"!=typeof console&&"function"==typeof console.log)if(window.opera)for(var e=0;e<arguments.length;)console.log("Item "+(e+1)+": "+arguments[e]),e++;else 1==l.call(arguments).length&&"string"==typeof l.call(arguments)[0]?console.log(l.call(arguments).toString()):console.log.apply(console,l.call(arguments));else Function.prototype.bind&&!u||"undefined"==typeof console||"object"!=typeof console.log||Function.prototype.call.call(console.log,console,l.call(arguments))}catch(t){}},g=function(e){if(e instanceof Error)throw e;throw new Error(e)};r={version:"2.0.1",noop:f,getModuleId:function(e){return e?"function"==typeof e?e.prototype.__moduleId__:"string"==typeof e?null:e.__moduleId__:null},setModuleId:function(e,t){return e?"function"==typeof e?(e.prototype.__moduleId__=t,void 0):("string"!=typeof e&&(e.__moduleId__=t),void 0):void 0},resolveObject:function(e){return r.isFunction(e)?new e:e},debug:function(e){return 1==arguments.length&&(i=e,i?(this.log=v,this.error=g,this.log("Debug:Enabled")):(this.log("Debug:Disabled"),this.log=f,this.error=f)),i},log:f,error:f,assert:function(e,t){e||r.error(new Error(t||"Assert:Failed"))},defer:function(e){return t.Deferred(e)},guid:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(e){var t=0|16*Math.random(),n="x"==e?t:8|3&t;return n.toString(16)})},acquire:function(){var t,n=arguments[0],i=!1;return r.isArray(n)?(t=n,i=!0):t=l.call(arguments,0),this.defer(function(n){e(t,function(){var e=arguments;setTimeout(function(){e.length>1||i?n.resolve(l.call(e,0)):n.resolve(e[0])},1)},function(e){n.reject(e)})}).promise()},extend:function(e){for(var t=l.call(arguments,1),n=0;n<t.length;n++){var r=t[n];if(r)for(var i in r)e[i]=r[i]}return e},wait:function(e){return r.defer(function(t){setTimeout(t.resolve,e)}).promise()}},r.keys=o||function(e){if(e!==Object(e))throw new TypeError("Invalid object");var t=[];for(var n in e)a.call(e,n)&&(t[t.length]=n);return t},r.isElement=function(e){return!(!e||1!==e.nodeType)},r.isArray=c||function(e){return"[object Array]"==s.call(e)},r.isObject=function(e){return e===Object(e)},r.isBoolean=function(e){return"boolean"==typeof e},r.isPromise=function(e){return e&&r.isFunction(e.then)};for(var p=["Arguments","Function","String","Number","Date","RegExp"],m=0;m<p.length;m++)n(p[m]);return r});
define('services/logger',["../../Scripts/durandal/system"],function(e){function t(e,t,n,i){r(e,t,n,i,"info")}function n(e,t,n,i){r(e,t,n,i,"error")}function r(t,n,r,i,o){r=r?"["+r+"] ":"",n?e.log(r,t,n):e.log(r,t),i&&("error"===o?toastr.error(t):toastr.info(t))}var i={log:t,logError:n};return i});
define('plugins/history',["durandal/system","jquery"],function(e,t){function n(e,t,n){if(n){var r=e.href.replace(/(javascript:|#).*$/,"");e.replace(r+"#"+t)}else e.hash="#"+t}var r=/^[#\/]|\s+$/g,i=/^\/+|\/+$/g,o=/msie [\w.]+/,a=/\/$/,s={interval:50,active:!1};return"undefined"!=typeof window&&(s.location=window.location,s.history=window.history),s.getHash=function(e){var t=(e||s).location.href.match(/#(.*)$/);return t?t[1]:""},s.getFragment=function(e,t){if(null==e)if(s._hasPushState||!s._wantsHashChange||t){e=s.location.pathname+s.location.search;var n=s.root.replace(a,"");e.indexOf(n)||(e=e.substr(n.length))}else e=s.getHash();return e.replace(r,"")},s.activate=function(n){s.active&&e.error("History has already been activated."),s.active=!0,s.options=e.extend({},{root:"/"},s.options,n),s.root=s.options.root,s._wantsHashChange=s.options.hashChange!==!1,s._wantsPushState=!!s.options.pushState,s._hasPushState=!!(s.options.pushState&&s.history&&s.history.pushState);var a=s.getFragment(),u=document.documentMode,c=o.exec(navigator.userAgent.toLowerCase())&&(!u||7>=u);s.root=("/"+s.root+"/").replace(i,"/"),c&&s._wantsHashChange&&(s.iframe=t('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow,s.navigate(a,!1)),s._hasPushState?t(window).on("popstate",s.checkUrl):s._wantsHashChange&&"onhashchange"in window&&!c?t(window).on("hashchange",s.checkUrl):s._wantsHashChange&&(s._checkUrlInterval=setInterval(s.checkUrl,s.interval)),s.fragment=a;var l=s.location,d=l.pathname.replace(/[^\/]$/,"$&/")===s.root;if(s._wantsHashChange&&s._wantsPushState){if(!s._hasPushState&&!d)return s.fragment=s.getFragment(null,!0),s.location.replace(s.root+s.location.search+"#"+s.fragment),!0;s._hasPushState&&d&&l.hash&&(this.fragment=s.getHash().replace(r,""),this.history.replaceState({},document.title,s.root+s.fragment+l.search))}return s.options.silent?void 0:s.loadUrl()},s.deactivate=function(){t(window).off("popstate",s.checkUrl).off("hashchange",s.checkUrl),clearInterval(s._checkUrlInterval),s.active=!1},s.checkUrl=function(){var e=s.getFragment();return e===s.fragment&&s.iframe&&(e=s.getFragment(s.getHash(s.iframe))),e===s.fragment?!1:(s.iframe&&s.navigate(e,!1),s.loadUrl(),void 0)},s.loadUrl=function(e){var t=s.fragment=s.getFragment(e);return s.options.routeHandler?s.options.routeHandler(t):!1},s.navigate=function(t,r){if(!s.active)return!1;if(void 0===r?r={trigger:!0}:e.isBoolean(r)&&(r={trigger:r}),t=s.getFragment(t||""),s.fragment!==t){s.fragment=t;var i=s.root+t;if(""===t&&"/"!==i&&(i=i.slice(0,-1)),s._hasPushState)s.history[r.replace?"replaceState":"pushState"]({},document.title,i);else{if(!s._wantsHashChange)return s.location.assign(i);n(s.location,t,r.replace),s.iframe&&t!==s.getFragment(s.getHash(s.iframe))&&(r.replace||s.iframe.document.open().close(),n(s.iframe.location,t,r.replace))}return r.trigger?s.loadUrl(t):void 0}},s.navigateBack=function(){s.history.back()},s});
define('plugins/router',["durandal/system","durandal/app","durandal/activator","durandal/events","durandal/composition","plugins/history","knockout","jquery"],function(e,t,n,r,i,o,a,s){function u(e){return e=e.replace(h,"\\$&").replace(g,"(?:$1)?").replace(p,function(e,t){return t?e:"([^/]+)"}).replace(m,"(.*?)"),new RegExp("^"+e+"$")}function c(e){var t=e.indexOf(":"),n=t>0?t-1:e.length;return e.substring(0,n)}function l(e,t){return-1!==e.indexOf(t,e.length-t.length)}function d(e,t){if(!e||!t)return!1;if(e.length!=t.length)return!1;for(var n=0,r=e.length;r>n;n++)if(e[n]!=t[n])return!1;return!0}var f,v,g=/\((.*?)\)/g,p=/(\(\?)?:\w+/g,m=/\*\w+/g,h=/[\-{}\[\]+?.,\\\^$|#\s]/g,b=/\/$/,w=function(){function i(e){return e.router&&e.router.parent==V}function s(e){N&&N.config.isActive&&N.config.isActive(e)}function g(t,n){e.log("Navigation Complete",t,n);var r=e.getModuleId(D);r&&V.trigger("router:navigation:from:"+r),D=t,s(!1),N=n,s(!0);var o=e.getModuleId(D);o&&V.trigger("router:navigation:to:"+o),i(t)||V.updateDocumentTitle(t,n),v.explicitNavigation=!1,v.navigatingBack=!1,V.trigger("router:navigation:complete",t,n,V)}function p(t,n){e.log("Navigation Cancelled"),V.activeInstruction(N),N&&V.navigate(N.fragment,!1),j(!1),v.explicitNavigation=!1,v.navigatingBack=!1,V.trigger("router:navigation:cancelled",t,n,V)}function m(t){e.log("Navigation Redirecting"),j(!1),v.explicitNavigation=!1,v.navigatingBack=!1,V.navigate(t,{trigger:!0,replace:!0})}function h(t,n,r){v.navigatingBack=!v.explicitNavigation&&D!=r.fragment,V.trigger("router:route:activating",n,r,V),t.activateItem(n,r.params).then(function(e){if(e){var o=D;if(g(n,r),i(n)){var a=r.fragment;r.queryString&&(a+="?"+r.queryString),n.router.loadUrl(a)}o==n&&(V.attached(),V.compositionComplete())}else t.settings.lifecycleData&&t.settings.lifecycleData.redirect?m(t.settings.lifecycleData.redirect):p(n,r);f&&(f.resolve(),f=null)}).fail(function(t){e.error(t)})}function y(t,n,r){var i=V.guardRoute(n,r);i?i.then?i.then(function(i){i?e.isString(i)?m(i):h(t,n,r):p(n,r)}):e.isString(i)?m(i):h(t,n,r):p(n,r)}function I(e,t,n){V.guardRoute?y(e,t,n):h(e,t,n)}function x(e){return N&&N.config.moduleId==e.config.moduleId&&D&&(D.canReuseForRoute&&D.canReuseForRoute.apply(D,e.params)||!D.canReuseForRoute&&D.router&&D.router.loadUrl)}function A(){if(!j()){var t=E.shift();E=[],t&&(j(!0),V.activeInstruction(t),x(t)?I(n.create(),D,t):e.acquire(t.config.moduleId).then(function(n){var r=e.resolveObject(n);I(C,r,t)}).fail(function(n){e.error("Failed to load routed module ("+t.config.moduleId+"). Details: "+n.message)}))}}function k(e){E.unshift(e),A()}function S(e,t,n){for(var r=e.exec(t).slice(1),i=0;i<r.length;i++){var o=r[i];r[i]=o?decodeURIComponent(o):null}var a=V.parseQueryString(n);return a&&r.push(a),{params:r,queryParams:a}}function _(t){V.trigger("router:route:before-config",t,V),e.isRegExp(t)?t.routePattern=t.route:(t.title=t.title||V.convertRouteToTitle(t.route),t.moduleId=t.moduleId||V.convertRouteToModuleId(t.route),t.hash=t.hash||V.convertRouteToHash(t.route),t.routePattern=u(t.route)),t.isActive=t.isActive||a.observable(!1),V.trigger("router:route:after-config",t,V),V.routes.push(t),V.route(t.routePattern,function(e,n){var r=S(t.routePattern,e,n);k({fragment:e,queryString:n,config:t,params:r.params,queryParams:r.queryParams})})}function T(t){if(e.isArray(t.route))for(var n=t.isActive||a.observable(!1),r=0,i=t.route.length;i>r;r++){var o=e.extend({},t);o.route=t.route[r],o.isActive=n,r>0&&delete o.nav,_(o)}else _(t);return V}var D,N,E=[],j=a.observable(!1),C=n.create(),V={handlers:[],routes:[],navigationModel:a.observableArray([]),activeItem:C,isNavigating:a.computed(function(){var e=C(),t=j(),n=e&&e.router&&e.router!=V&&e.router.isNavigating()?!0:!1;return t||n}),activeInstruction:a.observable(null),__router__:!0};return r.includeIn(V),C.settings.areSameItem=function(e,t,n,r){return e==t?d(n,r):!1},V.parseQueryString=function(e){var t,n;if(!e)return null;if(n=e.split("&"),0==n.length)return null;t={};for(var r=0;r<n.length;r++){var i=n[r];if(""!==i){var o=i.split("=");t[o[0]]=o[1]&&decodeURIComponent(o[1].replace(/\+/g," "))}}return t},V.route=function(e,t){V.handlers.push({routePattern:e,callback:t})},V.loadUrl=function(t){var n=V.handlers,r=null,i=t,a=t.indexOf("?");if(-1!=a&&(i=t.substring(0,a),r=t.substr(a+1)),V.relativeToParentRouter){var s=this.parent.activeInstruction();i=s.params.join("/"),i&&"/"==i.charAt(0)&&(i=i.substr(1)),i||(i=""),i=i.replace("//","/").replace("//","/")}i=i.replace(b,"");for(var u=0;u<n.length;u++){var c=n[u];if(c.routePattern.test(i))return c.callback(i,r),!0}return e.log("Route Not Found"),V.trigger("router:route:not-found",t,V),N&&o.navigate(N.fragment,{trigger:!1,replace:!0}),v.explicitNavigation=!1,v.navigatingBack=!1,!1},V.updateDocumentTitle=function(e,n){n.config.title?document.title=t.title?n.config.title+" | "+t.title:n.config.title:t.title&&(document.title=t.title)},V.navigate=function(e,t){return e&&-1!=e.indexOf("://")?(window.location.href=e,!0):(v.explicitNavigation=!0,o.navigate(e,t))},V.navigateBack=function(){o.navigateBack()},V.attached=function(){V.trigger("router:navigation:attached",D,N,V)},V.compositionComplete=function(){j(!1),V.trigger("router:navigation:composition-complete",D,N,V),A()},V.convertRouteToHash=function(e){if(V.relativeToParentRouter){var t=V.parent.activeInstruction(),n=t.config.hash+"/"+e;return o._hasPushState&&(n="/"+n),n=n.replace("//","/").replace("//","/")}return o._hasPushState?e:"#"+e},V.convertRouteToModuleId=function(e){return c(e)},V.convertRouteToTitle=function(e){var t=c(e);return t.substring(0,1).toUpperCase()+t.substring(1)},V.map=function(t,n){if(e.isArray(t)){for(var r=0;r<t.length;r++)V.map(t[r]);return V}return e.isString(t)||e.isRegExp(t)?(n?e.isString(n)&&(n={moduleId:n}):n={},n.route=t):n=t,T(n)},V.buildNavigationModel=function(t){for(var n=[],r=V.routes,i=t||100,o=0;o<r.length;o++){var a=r[o];a.nav&&(e.isNumber(a.nav)||(a.nav=++i),n.push(a))}return n.sort(function(e,t){return e.nav-t.nav}),V.navigationModel(n),V},V.mapUnknownRoutes=function(t,n){var r="*catchall",i=u(r);return V.route(i,function(a,s){var u=S(i,a,s),c={fragment:a,queryString:s,config:{route:r,routePattern:i},params:u.params,queryParams:u.queryParams};if(t)if(e.isString(t))c.config.moduleId=t,n&&o.navigate(n,{trigger:!1,replace:!0});else if(e.isFunction(t)){var l=t(c);if(l&&l.then)return l.then(function(){V.trigger("router:route:before-config",c.config,V),V.trigger("router:route:after-config",c.config,V),k(c)}),void 0}else c.config=t,c.config.route=r,c.config.routePattern=i;else c.config.moduleId=a;V.trigger("router:route:before-config",c.config,V),V.trigger("router:route:after-config",c.config,V),k(c)}),V},V.reset=function(){return N=D=void 0,V.handlers=[],V.routes=[],V.off(),delete V.options,V},V.makeRelative=function(t){return e.isString(t)&&(t={moduleId:t,route:t}),t.moduleId&&!l(t.moduleId,"/")&&(t.moduleId+="/"),t.route&&!l(t.route,"/")&&(t.route+="/"),t.fromParent&&(V.relativeToParentRouter=!0),V.on("router:route:before-config").then(function(e){t.moduleId&&(e.moduleId=t.moduleId+e.moduleId),t.route&&(e.route=""===e.route?t.route.substring(0,t.route.length-1):t.route+e.route)}),V},V.createChildRouter=function(){var e=w();return e.parent=V,e},V};return v=w(),v.explicitNavigation=!1,v.navigatingBack=!1,v.targetIsThisWindow=function(e){var t=s(e.target).attr("target");return!t||t===window.name||"_self"===t||"top"===t&&window===window.top?!0:!1},v.activate=function(t){return e.defer(function(n){if(f=n,v.options=e.extend({routeHandler:v.loadUrl},v.options,t),o.activate(v.options),o._hasPushState)for(var r=v.routes,i=r.length;i--;){var a=r[i];a.hash=a.hash.replace("#","")}s(document).delegate("a","click",function(e){if(o._hasPushState){if(!e.altKey&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&v.targetIsThisWindow(e)){var t=s(this).attr("href");null==t||"#"===t.charAt(0)||/^[a-z]+:/i.test(t)||(v.explicitNavigation=!0,e.preventDefault(),o.navigate(t))}}else v.explicitNavigation=!0}),o.options.silent&&f&&(f.resolve(),f=null)}).promise()},v.deactivate=function(){o.deactivate()},v.install=function(){a.bindingHandlers.router={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,r,o){var s=a.utils.unwrapObservable(t())||{};if(s.__router__)s={model:s.activeItem(),attached:s.attached,compositionComplete:s.compositionComplete,activate:!1};else{var u=a.utils.unwrapObservable(s.router||r.router)||v;s.model=u.activeItem(),s.attached=u.attached,s.compositionComplete=u.compositionComplete,s.activate=!1}i.compose(e,s,o)}},a.virtualElements.allowedBindings.router=!0},v});
requirejs.config({paths:{text:"../Scripts/text",durandal:"../Scripts/durandal",plugins:"../Scripts/durandal/plugins",transitions:"../Scripts/durandal/transitions"}}),define("jquery",[],function(){return jQuery}),define("knockout",ko),define('main',["durandal/system","durandal/app","durandal/viewLocator","services/logger","plugins/router"],function(e,t,n,r){e.debug(!0),t.title="Foundation Portal",t.configurePlugins({router:!0,dialog:!0,widget:!0}),t.start().then(function(){n.useConvention(),t.setRoot("viewmodels/shell"),toastr.options.positionClass="toast-bottom-full-width",toastr.options.backgroundpositionClass="toast-bottom-full-width",window.addEventListener("offline",function(){navigator.onLine||r.logError("No Internet connection",null,"main",!0)})})});
define('viewmodels/areas/browse',["services/logger","plugins/router","datacontexts/area.datacontext"],function(e,t,n){function r(){return e.log("Browse areas view activated",null,"areas/browse",!1),!0}function i(){return a("get"),!0}function o(){return f.error(void 0),f.removeItems(!1),!0}function a(e){return n.getItems(f.items,f.error,e,null,[s])}function s(){return 0===f.items().length?f.noItemsToShow(!0):f.noItemsToShow(!1)}function u(){return f.removeItems(!f.removeItems())}function c(e){return f.removeItems()?confirm("Are you sure you want to delete this item?")?l(e):void 0:t.navigate("#/areas/edit/"+e.Id)}function l(e){return n.deleteItem(e,[d,s])}function d(e){return f.items.remove(e)}var f={error:ko.observable(),title:"AREAS",activate:r,attached:i,deactivate:o,items:ko.observableArray([]),noItemsToShow:ko.observable(!0),removeItems:ko.observable(!1),toggleRemoveItems:u,selectItem:c};return f});
define('viewmodels/areas/create',["services/logger","plugins/router","datacontexts/area.datacontext","viewmodels/areas/browse"],function(e,t,n,r){function i(){return e.log("Create area view activated",null,"areas/create",!1),l.item(n.createItem({})),!0}function o(){return l.error(void 0),l.item(void 0),!0}function a(e){n.saveNewItem(e,[s,u,c])}function s(e){r.items.push(e)}function u(){t.navigate("#/areas/browse")}function c(){l.item(void 0)}var l={error:ko.observable(),title:"NEW AREA",activate:i,deactivate:o,item:ko.observable(),saveItem:a};return l});
define('viewmodels/areas/edit',["services/logger","plugins/router","datacontexts/area.datacontext","viewmodels/areas/browse"],function(e,t,n,r){function i(t){return e.log("Edit area view activated",null,"areas/edit",!1),a(t),!0}function o(){return l.error(void 0),l.item(void 0),!0}function a(e){return t.activeItem()&&(t.activeItem().__moduleId__,void 0!==r.items()&&ko.utils.arrayFirst(r.items(),function(t){return t.Id===e?l.item(t):void 0})),n.getItem(e,l.item,l.error)}function s(e){n.saveChangedItem(e,[u,c])}function u(e){r.items.remove(function(t){return t.Id===e.Id}),r.items.push(e)}function c(){t.navigate("#/areas/browse")}var l={error:ko.observable(),title:"EDIT AREA",activate:i,deactivate:o,item:ko.observable(),saveItem:s};return l});
define('viewmodels/funds/browse',["services/logger","plugins/router","datacontexts/fund.datacontext","datacontexts/area.datacontext"],function(e,t,n,r){function i(){return e.log("Browse funds view activated",null,"funds/browse",!1),!0}function o(){return s("get"),!0}function a(){return v.error(void 0),!0}function s(e){return r.getItems(v.areas,v.error,e,null,[u])}function u(e){v.selectedAreaId(e[0].Id)}function c(e){return n.getItems(v.items,v.error,e,{areaId:v.selectedAreaId()},[l])}function l(){return 0===v.items().length?v.noItemsToShow(!0):v.noItemsToShow(!1)}function d(e){return t.navigate("#/funds/edit/"+e.Id)}function f(){return t.navigate("#/funds/create/"+v.selectedAreaId())}var v={error:ko.observable(),title:"FUNDS",activate:i,attached:o,deactivate:a,areas:ko.observableArray([]),selectedAreaId:ko.observable(),items:ko.observableArray([]),noItemsToShow:ko.observable(!0),selectItem:d,navigateToCreateView:f,updateNoItemsToShowProperty:l};return v.selectedAreaId.subscribe(function(){c("getbyarea")}),v});
define('viewmodels/funds/create',["services/logger","plugins/router","datacontexts/fund.datacontext","datacontexts/fileupload.datacontext","viewmodels/funds/browse"],function(e,t,n,r,i){function o(t){return e.log("Create fund view activated",null,"funds/create",!1),f.item(n.createItem({AreaId:t})),!0}function a(){return f.error(void 0),f.item(void 0),!0}function s(e,t){r.saveNewItem(e,t,f.item().FileUploads,f.error)}function u(e){f.item().FileUploads.remove(e)}function c(e){n.saveNewItem(e,[l,d])}function l(e){i.items.push(n.createItem(e)),i.updateNoItemsToShowProperty()}function d(){t.navigate("#/funds/browse")}var f={error:ko.observable(),title:"NEW FUND",activate:o,deactivate:a,item:ko.observable(),postFiles:s,saveItem:c,removeFileUpload:u};return f});
define('viewmodels/funds/edit',["services/logger","plugins/router","datacontexts/fund.datacontext","viewmodels/funds/browse"],function(e,t,n,r){function i(t){return e.log("Edit fund view activated",null,"funds/edit",!1),a(t),!0}function o(){return l.error(void 0),l.item(void 0),!0}function a(e){return ko.utils.arrayFirst(r.items(),function(t){return t.Id===e?l.item(t):void 0}),void 0==l.item()?n.getItem(e,l.item,l.error):void 0}function s(e){n.saveChangedItem(e,[u,c])}function u(e){r.items.remove(function(t){return t.Id===e.Id}),r.items.push(n.createItem(e)),r.updateNoItemsToShowProperty()}function c(){t.navigate("#/funds/browse")}var l={error:ko.observable(),title:"EDIT FUND",activate:i,deactivate:o,item:ko.observable(),saveItem:s};return l});
define('viewmodels/shell',["plugins/router","durandal/app"],function(e){function t(){return e.map([{route:"",moduleId:"viewmodels/funds/browse"},{route:"areas/browse",moduleId:"viewmodels/areas/browse"},{route:"areas/create",moduleId:"viewmodels/areas/create"},{route:"areas/edit/:id",moduleId:"viewmodels/areas/edit"},{route:"funds/browse",moduleId:"viewmodels/funds/browse"},{route:"funds/create/:areaid",moduleId:"viewmodels/funds/create"},{route:"funds/edit/:id",moduleId:"viewmodels/funds/edit"}]).buildNavigationModel(),e.activate()}var n={activate:t,router:e};return n});
define('text',{load: function(id){throw new Error("Dynamic load not allowed: " + id);}});
define('text!views/areas/browse.html',[],function () { return '<div class="row collapse">\r\n    <div class="large-12 columns">\r\n        <p>\r\n            <strong>\r\n                <a data-bind="fastlink: \'/#/areas/create\'">Create a new area</a>\r\n            </strong>\r\n        </p>\r\n\r\n        <table class="bumped">\r\n            <thead>\r\n                <tr>\r\n                    <th>Areas</th>\r\n                    <th class="right" data-bind="fastbutton: toggleRemoveItems">\r\n                        <i data-bind="css: removeItems() ? \'fi-x\' : \'fi-trash\'"></i>\r\n                    </th>\r\n                </tr>\r\n            </thead>\r\n            <tbody data-bind="foreach: items">\r\n                <tr>\r\n                    <td colspan="2">\r\n                        <a data-bind="fastbutton: $parent.selectItem">\r\n                            <span data-bind="text: Name"></span>\r\n                            <span class="right" data-bind="ifnot: $parent.removeItems">&#62</span>\r\n                            <span class="right" data-bind="if: $parent.removeItems">\r\n                                <i class="fi-trash"></i>\r\n                            </span>\r\n                        </a>\r\n                    </td>\r\n                </tr>\r\n            </tbody>\r\n        </table>\r\n\r\n        <p class="error" data-bind="text: error"></p>\r\n    </div>\r\n</div>';});

define('text!views/areas/create.html',[],function () { return '<section data-bind="compose: { view: \'shared/_area-input\' }"></section>';});

define('text!views/areas/edit.html',[],function () { return '<section data-bind="compose: { view: \'shared/_area-input\' }"></section>';});

define('text!views/funds/browse.html',[],function () { return '<div class="row collapse">\r\n    <div class="large-12 columns">\r\n        <div class="row">\r\n            <div class="large-12 columns">\r\n                <p>\r\n                    <strong>\r\n                        <a data-bind="click: navigateToCreateView">Create a new fund</a>\r\n                    </strong>\r\n                </p>\r\n            </div>\r\n        </div>\r\n\r\n        <p class="error" data-bind="if: error, text: error"></p>\r\n\r\n        <div class="row">\r\n            <div class="large-4 columns">\r\n                <label for="Area">\r\n                    Area\r\n                </label>\r\n                <select name="Area" data-bind="foreach: areas, value: selectedAreaId">\r\n                    <option data-bind="attr: { value: Id }, text: Name"></option>\r\n                </select>\r\n            </div>\r\n        </div>\r\n\r\n        <div class="row">\r\n            <div class="large-12 columns">\r\n                <table data-bind="visible: !noItemsToShow()">\r\n                    <thead>\r\n                        <tr>\r\n                            <th>Fund number</th>\r\n                            <th>Fund title</th>\r\n                            <th>Responsible person</th>\r\n                            <th>Current fiscal year approved budget</th>\r\n                            <th>YTD and projected expenditures through June 30</th>\r\n                            <th>Requested budget</th>\r\n                            <th>Variance</th>\r\n                            <th>Status</th>\r\n                        </tr>\r\n                    </thead>\r\n                    <tbody data-bind="foreach: items">\r\n                        <tr>\r\n                            <td>\r\n                                <a data-bind="fastlink: \'#/funds/edit/\' + Id, text: Number"></a>\r\n                            </td>\r\n                            <td data-bind="text: Title"></td>\r\n                            <td data-bind="text: ResponsiblePerson"></td>\r\n                            <td data-bind="text: CurrentBudget"></td>\r\n                            <td data-bind="text: ProjectedExpenditures"></td>\r\n                            <td data-bind="text: requestedBudget"></td>\r\n                            <td data-bind="text: variance"></td>\r\n                            <td data-bind="text: statusText"></td>\r\n                        </tr>\r\n                    </tbody>\r\n                </table>\r\n            </div>\r\n        </div>\r\n\r\n        <h4 class="text-center" data-bind="if: noItemsToShow">No records</h4>\r\n    </div>\r\n</div>\r\n';});

define('text!views/funds/create.html',[],function () { return '<section data-bind="compose: { view: \'shared/_fund-input\' }"></section>';});

define('text!views/funds/edit.html',[],function () { return '<section data-bind="compose: { view: \'shared/_fund-input\' }"></section>';});

define('text!views/shared/_area-input.html',[],function () { return '<div class="row view-background">\r\n    <div class="large-12 columns">\r\n        <section data-bind="with: item">\r\n            <h1 class="view-headline">Area information</h1>\r\n\r\n            <div class="row">\r\n                <div class="large-12 columns">\r\n                    <label for="Number">\r\n                        Number\r\n                    </label>\r\n                    <input name="Number" type="text" data-bind="value: Number" />\r\n                </div>\r\n            </div>\r\n\r\n            <div class="row">\r\n                <div class="large-12 columns">\r\n                    <label for="Name">\r\n                        Name\r\n                    </label>\r\n                    <input name="Name" type="text" data-bind="value: Name" />\r\n                </div>\r\n            </div>\r\n\r\n            <div class="row">\r\n                <div class="large-12 columns">\r\n                    <span class="text-button" data-bind="click: $parent.saveItem">\r\n                        Save\r\n                    </span>\r\n                </div>\r\n            </div>\r\n        </section>\r\n    </div>\r\n</div>';});

define('text!views/shared/_fund-input.html',[],function () { return '<div class="row view-background">\r\n    <div class="large-12 columns">\r\n        <section data-bind="with: item">\r\n            <h1 class="view-headline">Fund information</h1>\r\n\r\n            <fieldset>\r\n                <legend>Current status</legend>\r\n\r\n                <div class="row">\r\n                    <div class="large-4 columns">\r\n                        <label for="Status">\r\n                            Status\r\n                        </label>\r\n                        <select name="Status" data-bind="value: Status">\r\n                            <option value="1">Draft</option>\r\n                            <option value="2">Final</option>\r\n                        </select>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-4 columns">\r\n                        <label for="Number">\r\n                            Fund number\r\n                        </label>\r\n                        <input name="Number" type="text" data-bind="value: Number" />\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-8 columns">\r\n                        <label for="Title">\r\n                            Fund title\r\n                        </label>\r\n                        <input name="Title" type="text" data-bind="value: Title" />\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-6 columns">\r\n                        <label for="ResponsiblePerson">\r\n                            Responsible person\r\n                        </label>\r\n                        <input name="ResponsiblePerson" type="text" data-bind="value: ResponsiblePerson" />\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-6 columns">\r\n                        <label for="CurrentBudget">\r\n                            Current fiscal year approved budget\r\n                        </label>\r\n                        <input name="CurrentBudget" type="text" data-bind="value: CurrentBudget" />\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-6 columns">\r\n                        <label for="ProjectedExpenditures">\r\n                            YTD and projected expenditures through June 30\r\n                        </label>\r\n                        <input name="ProjectedExpenditures" type="text" data-bind="value: ProjectedExpenditures" />\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row panel">\r\n                    <div class="large-6 columns">\r\n                        <span>Projected year-end balance :\r\n                            <strong data-bind="text: projectedYearEndBalance"></strong>\r\n                        </span>\r\n                    </div>\r\n                </div>\r\n            </fieldset>\r\n\r\n            <fieldset>\r\n                <legend>Next year projected budget</legend>\r\n\r\n                <div class="row">\r\n                    <div class="large-4 columns">\r\n                        <label for="BudgetAdjustment">\r\n                            Projected increase or decrease\r\n                        </label>\r\n                        <input name="BudgetAdjustment" type="text" data-bind="value: BudgetAdjustment" />\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row panel">\r\n                    <div class="large-12 columns">\r\n                        <span>Requested budget: \r\n                            <strong data-bind="text: requestedBudget"></strong>\r\n                        </span>\r\n                    </div>\r\n                </div>\r\n            </fieldset>\r\n\r\n            <fieldset>\r\n                <legend>Supporting information</legend>\r\n\r\n                <div class="row">\r\n                    <div class="large-12 columns">\r\n                        <label for="Description">\r\n                            Brief description of the program and types of expenses paid for by this fund\r\n                        </label>\r\n                        <textarea name="Description" data-bind="value: Description"></textarea>\r\n                    </div>\r\n                </div>\r\n\r\n                <div class="row">\r\n                    <div class="large-12 columns">\r\n                        <label for="BudgetAdjustmentNote">\r\n                            Reason for increase or decrease in the requested budget\r\n                        </label>\r\n                        <textarea name="BudgetAdjustmentNote" data-bind="value: BudgetAdjustmentNote"></textarea>\r\n                    </div>\r\n                </div>\r\n            </fieldset>\r\n\r\n            <fieldset>\r\n                <legend>Attachments</legend>\r\n\r\n                <div class="row">\r\n                    <div class="large-12 columns">\r\n                        <a href="#">Download template</a>\r\n                    </div>\r\n                </div>\r\n\r\n                <form name="fileInputForm">\r\n                    <input type="file" name="files[]" multiple\r\n                        data-bind="event: { onload: window.fileInputForm.reset(), change: $parent.postFiles }" />\r\n                </form>\r\n\r\n                <div class="row">\r\n                    <div class="large-12 columns">\r\n                        <table data-bind="visible: FileUploads().length > 0">\r\n                            <thead>\r\n                                <tr>\r\n                                    <th>File</th>\r\n                                    <th></th>\r\n                                </tr>\r\n                            </thead>\r\n                            <tbody data-bind="foreach: FileUploads">\r\n                                <tr>\r\n                                    <td>\r\n                                        <a data-bind="visible: Id, text: OriginalFileName,\r\n                                        attr: { href: Source }"></a>\r\n                                        <span class="error-message" \r\n                                            data-bind="visible: errorMessage, text: errorMessage"></span>\r\n                                    </td>\r\n                                    <td data-bind="click: $root.removeFileUpload">\r\n                                        <i class="fi-trash"></i>\r\n                                    </td>\r\n                                </tr>\r\n                            </tbody>\r\n                        </table>\r\n\r\n                        <p data-bind="visible: FileUploads().length === 0">No files uploaded</p>\r\n                    </div>\r\n                </div>\r\n            </fieldset>\r\n\r\n            <div class="row">\r\n                <div class="large-12 columns">\r\n                    <span class="text-button" data-bind="click: $parent.saveItem">Save\r\n                    </span>\r\n                </div>\r\n            </div>\r\n        </section>\r\n\r\n    </div>\r\n</div>\r\n';});

define('text!views/shell.html',[],function () { return '<section id="content" data-bind="router: { transition: \'scrollers\', cacheViews: true }">\r\n</section>\r\n';});

define('plugins/dialog',["durandal/system","durandal/app","durandal/composition","durandal/activator","durandal/viewEngine","jquery","knockout"],function(e,t,n,r,i,o,a){function s(t){return e.defer(function(n){e.isString(t)?e.acquire(t).then(function(t){n.resolve(e.resolveObject(t))}).fail(function(n){e.error("Failed to load dialog module ("+t+"). Details: "+n.message)}):n.resolve(t)}).promise()}var u,c={},l=0,d=function(e,t,n){this.message=e,this.title=t||d.defaultTitle,this.options=n||d.defaultOptions};return d.prototype.selectOption=function(e){u.close(this,e)},d.prototype.getView=function(){return i.processMarkup(d.defaultViewMarkup)},d.setViewUrl=function(e){delete d.prototype.getView,d.prototype.viewUrl=e},d.defaultTitle=t.title||"Application",d.defaultOptions=["Ok"],d.defaultViewMarkup=['<div data-view="plugins/messageBox" class="messageBox">','<div class="modal-header">','<h3 data-bind="text: title"></h3>',"</div>",'<div class="modal-body">','<p class="message" data-bind="text: message"></p>',"</div>",'<div class="modal-footer" data-bind="foreach: options">','<button class="btn" data-bind="click: function () { $parent.selectOption($data); }, text: $data, css: { \'btn-primary\': $index() == 0, autofocus: $index() == 0 }"></button>',"</div>","</div>"].join("\n"),u={MessageBox:d,currentZIndex:1050,getNextZIndex:function(){return++this.currentZIndex},isOpen:function(){return l>0},getContext:function(e){return c[e||"default"]},addContext:function(e,t){t.name=e,c[e]=t;var n="show"+e.substr(0,1).toUpperCase()+e.substr(1);this[n]=function(t,n){return this.show(t,n,e)}},createCompositionSettings:function(e,t){var n={model:e,activate:!1,transition:!1};return t.attached&&(n.attached=t.attached),t.compositionComplete&&(n.compositionComplete=t.compositionComplete),n},getDialog:function(e){return e?e.__dialog__:void 0},close:function(e){var t=this.getDialog(e);if(t){var n=Array.prototype.slice.call(arguments,1);t.close.apply(t,n)}},show:function(t,i,o){var a=this,u=c[o||"default"];return e.defer(function(e){s(t).then(function(t){var o=r.create();o.activateItem(t,i).then(function(r){if(r){var i=t.__dialog__={owner:t,context:u,activator:o,close:function(){var n=arguments;o.deactivateItem(t,!0).then(function(r){r&&(l--,u.removeHost(i),delete t.__dialog__,0===n.length?e.resolve():1===n.length?e.resolve(n[0]):e.resolve.apply(e,n))})}};i.settings=a.createCompositionSettings(t,u),u.addHost(i),l++,n.compose(i.host,i.settings)}else e.resolve(!1)})})}).promise()},showMessage:function(t,n,r){return e.isString(this.MessageBox)?u.show(this.MessageBox,[t,n||d.defaultTitle,r||d.defaultOptions]):u.show(new this.MessageBox(t,n,r))},install:function(e){t.showDialog=function(e,t,n){return u.show(e,t,n)},t.showMessage=function(e,t,n){return u.showMessage(e,t,n)},e.messageBox&&(u.MessageBox=e.messageBox),e.messageBoxView&&(u.MessageBox.prototype.getView=function(){return e.messageBoxView})}},u.addContext("default",{blockoutOpacity:.2,removeDelay:200,addHost:function(e){var t=o("body"),n=o('<div class="modalBlockout"></div>').css({"z-index":u.getNextZIndex(),opacity:this.blockoutOpacity}).appendTo(t),r=o('<div class="modalHost"></div>').css({"z-index":u.getNextZIndex()}).appendTo(t);if(e.host=r.get(0),e.blockout=n.get(0),!u.isOpen()){e.oldBodyMarginRight=t.css("margin-right"),e.oldInlineMarginRight=t.get(0).style.marginRight;var i=o("html"),a=t.outerWidth(!0),s=i.scrollTop();o("html").css("overflow-y","hidden");var c=o("body").outerWidth(!0);t.css("margin-right",c-a+parseInt(e.oldBodyMarginRight,10)+"px"),i.scrollTop(s)}},removeHost:function(e){if(o(e.host).css("opacity",0),o(e.blockout).css("opacity",0),setTimeout(function(){a.removeNode(e.host),a.removeNode(e.blockout)},this.removeDelay),!u.isOpen()){var t=o("html"),n=t.scrollTop();t.css("overflow-y","").scrollTop(n),e.oldInlineMarginRight?o("body").css("margin-right",e.oldBodyMarginRight):o("body").css("margin-right","")}},attached:function(e){o(e).css("visibility","hidden")},compositionComplete:function(e,t,n){var r=u.getDialog(n.model),i=o(e),a=i.find("img").filter(function(){var e=o(this);return!(this.style.width&&this.style.height||e.attr("width")&&e.attr("height"))});i.data("predefinedWidth",i.get(0).style.width);var s=function(){setTimeout(function(){i.data("predefinedWidth")||i.css({width:""});var e=i.outerWidth(!1),t=i.outerHeight(!1),n=o(window).height(),a=Math.min(t,n);i.css({"margin-top":(-a/2).toString()+"px","margin-left":(-e/2).toString()+"px"}),i.data("predefinedWidth")||i.outerWidth(e),t>n?i.css("overflow-y","auto"):i.css("overflow-y",""),o(r.host).css("opacity",1),i.css("visibility","visible"),i.find(".autofocus").first().focus()},1)};s(),a.load(s),i.hasClass("autoclose")&&o(r.blockout).click(function(){r.close()})}}),u});
define('plugins/http',["jquery","knockout"],function(e,t){return{callbackParam:"callback",get:function(t,n){return e.ajax(t,{data:n})},jsonp:function(t,n,r){return-1==t.indexOf("=?")&&(r=r||this.callbackParam,t+=-1==t.indexOf("?")?"?":"&",t+=r+"=?"),e.ajax({url:t,dataType:"jsonp",data:n})},post:function(n,r){return e.ajax({url:n,data:t.toJSON(r),type:"POST",contentType:"application/json",dataType:"json"})}}});
define('plugins/observable',["durandal/system","durandal/binder","knockout"],function(e,t,n){function r(e){var t=e[0];return"_"===t||"$"===t}function i(t){return!(!t||void 0===t.nodeType||!e.isNumber(t.nodeType))}function o(e){if(!e||i(e)||e.ko===n||e.jquery)return!1;var t=f.call(e);return-1==v.indexOf(t)&&!(e===!0||e===!1)}function a(e,t){var n=e.__observable__,r=!0;if(!n||!n.__full__){n=n||(e.__observable__={}),n.__full__=!0,g.forEach(function(n){e[n]=function(){r=!1;var e=b[n].apply(t,arguments);return r=!0,e}}),p.forEach(function(n){e[n]=function(){r&&t.valueWillMutate();var i=h[n].apply(e,arguments);return r&&t.valueHasMutated(),i}}),m.forEach(function(n){e[n]=function(){for(var i=0,o=arguments.length;o>i;i++)s(arguments[i]);r&&t.valueWillMutate();var a=h[n].apply(e,arguments);return r&&t.valueHasMutated(),a}}),e.splice=function(){for(var n=2,i=arguments.length;i>n;n++)s(arguments[n]);r&&t.valueWillMutate();var o=h.splice.apply(e,arguments);return r&&t.valueHasMutated(),o};for(var i=0,o=e.length;o>i;i++)s(e[i])}}function s(t){var i,s;if(o(t)&&(i=t.__observable__,!i||!i.__full__)){if(i=i||(t.__observable__={}),i.__full__=!0,e.isArray(t)){var u=n.observableArray(t);a(t,u)}else for(var l in t)r(l)||i[l]||(s=t[l],e.isFunction(s)||c(t,l,s));w&&e.log("Converted",t)}}function u(e,t,n){var r;e(t),r=e.peek(),n?r?r.destroyAll||a(r,e):(r=[],e(r),a(r,e)):s(r)}function c(t,r,i){var o,c,l=t.__observable__||(t.__observable__={});if(void 0===i&&(i=t[r]),e.isArray(i))o=n.observableArray(i),a(i,o),c=!0;else if("function"==typeof i){if(!n.isObservable(i))return null;o=i}else e.isPromise(i)?(o=n.observable(),i.then(function(t){if(e.isArray(t)){var r=n.observableArray(t);a(t,r),t=r}o(t)})):(o=n.observable(i),s(i));return Object.defineProperty(t,r,{configurable:!0,enumerable:!0,get:o,set:n.isWriteableObservable(o)?function(t){t&&e.isPromise(t)?t.then(function(t){u(o,t,e.isArray(t))}):u(o,t,c)}:void 0}),l[r]=o,o}function l(t,r,i){var o,a={owner:t,deferEvaluation:!0};return"function"==typeof i?a.read=i:("value"in i&&e.error('For defineProperty, you must not specify a "value" for the property. You must provide a "get" function.'),"function"!=typeof i.get&&e.error('For defineProperty, the third parameter must be either an evaluator function, or an options object containing a function called "get".'),a.read=i.get,a.write=i.set),o=n.computed(a),t[r]=o,c(t,r,o)}var d,f=Object.prototype.toString,v=["[object Function]","[object String]","[object Boolean]","[object Number]","[object Date]","[object RegExp]"],g=["remove","removeAll","destroy","destroyAll","replace"],p=["pop","reverse","sort","shift","splice"],m=["push","unshift"],h=Array.prototype,b=n.observableArray.fn,w=!1;return d=function(e,t){var r,i,o;return e?(r=e.__observable__,r&&(i=r[t])?i:(o=e[t],n.isObservable(o)?o:c(e,t,o))):null},d.defineProperty=l,d.convertProperty=c,d.convertObject=s,d.install=function(e){var n=t.binding;t.binding=function(e,t,r){r.applyBindings&&!r.skipConversion&&s(e),n(e,t)},w=e.logConversion},d});
define('plugins/serializer',["durandal/system"],function(e){return{typeAttribute:"type",space:void 0,replacer:function(e,t){if(e){var n=e[0];if("_"===n||"$"===n)return void 0}return t},serialize:function(t,n){return n=void 0===n?{}:n,(e.isString(n)||e.isNumber(n))&&(n={space:n}),JSON.stringify(t,n.replacer||this.replacer,n.space||this.space)},getTypeId:function(e){return e?e[this.typeAttribute]:void 0},typeMap:{},registerType:function(){var t=arguments[0];if(1==arguments.length){var n=t[this.typeAttribute]||e.getModuleId(t);this.typeMap[n]=t}else this.typeMap[t]=arguments[1]},reviver:function(e,t,n,r){var i=n(t);if(i){var o=r(i);if(o)return o.fromJSON?o.fromJSON(t):new o(t)}return t},deserialize:function(e,t){var n=this;t=t||{};var r=t.getTypeId||function(e){return n.getTypeId(e)},i=t.getConstructor||function(e){return n.typeMap[e]},o=t.reviver||function(e,t){return n.reviver(e,t,r,i)};return JSON.parse(e,o)}}});
define('plugins/widget',["durandal/system","durandal/composition","jquery","knockout"],function(e,t,n,r){function i(e,n){var i=r.utils.domData.get(e,u);i||(i={parts:t.cloneNodes(r.virtualElements.childNodes(e))},r.virtualElements.emptyNode(e),r.utils.domData.set(e,u,i)),n.parts=i.parts}var o={},a={},s=["model","view","kind"],u="durandal-widget-data",c={getSettings:function(t){var n=r.utils.unwrapObservable(t())||{};if(e.isString(n))return{kind:n};for(var i in n)n[i]=-1!=r.utils.arrayIndexOf(s,i)?r.utils.unwrapObservable(n[i]):n[i];return n},registerKind:function(e){r.bindingHandlers[e]={init:function(){return{controlsDescendantBindings:!0}},update:function(t,n,r,o,a){var s=c.getSettings(n);s.kind=e,i(t,s),c.create(t,s,a,!0)}},r.virtualElements.allowedBindings[e]=!0,t.composeBindings.push(e+":")},mapKind:function(e,t,n){t&&(a[e]=t),n&&(o[e]=n)},mapKindToModuleId:function(e){return o[e]||c.convertKindToModulePath(e)},convertKindToModulePath:function(e){return"widgets/"+e+"/viewmodel"},mapKindToViewId:function(e){return a[e]||c.convertKindToViewPath(e)},convertKindToViewPath:function(e){return"widgets/"+e+"/view"},createCompositionSettings:function(e,t){return t.model||(t.model=this.mapKindToModuleId(t.kind)),t.view||(t.view=this.mapKindToViewId(t.kind)),t.preserveContext=!0,t.activate=!0,t.activationData=t,t.mode="templated",t},create:function(e,n,r,i){i||(n=c.getSettings(function(){return n},e));var o=c.createCompositionSettings(e,n);t.compose(e,o,r)},install:function(e){if(e.bindingName=e.bindingName||"widget",e.kinds)for(var n=e.kinds,o=0;o<n.length;o++)c.registerKind(n[o]);r.bindingHandlers[e.bindingName]={init:function(){return{controlsDescendantBindings:!0}},update:function(e,t,n,r,o){var a=c.getSettings(t);i(e,a),c.create(e,a,o,!0)}},t.composeBindings.push(e.bindingName+":"),r.virtualElements.allowedBindings[e.bindingName]=!0}};return c});
define('transitions/entrance',["durandal/system","durandal/composition","jquery"],function(e,t,n){var r=100,i={marginRight:0,marginLeft:0,opacity:1},o={marginLeft:"",marginRight:"",opacity:"",display:""},a=function(t){return e.defer(function(e){function a(){e.resolve()}function s(){t.keepScrollPosition||n(document).scrollTop(0)}function u(){s(),t.triggerAttach();var e={marginLeft:l?"0":"20px",marginRight:l?"0":"-20px",opacity:0,display:"block"},r=n(t.child);r.css(e),r.animate(i,{duration:c,easing:"swing",always:function(){r.css(o),a()}})}if(t.child){var c=t.duration||500,l=!!t.fadeOnly;t.activeView?n(t.activeView).fadeOut({duration:r,always:u}):u()}else n(t.activeView).fadeOut(r,a)}).promise()};return a});
define('transitions/scrollers',["durandal/system","durandal/composition","jquery"],function(e,t,n){var r=function(t){return e.defer(function(e){function r(){e.resolve()}function i(){t.keepScrollPosition||n(document).scrollTop(0)}function o(){i(),t.triggerAttach();var e=n(t.child);e.show(0,r)}t.child?t.activeView?n(t.activeView).hide(0,o):o():n(t.activeView).hide(0,r)}).promise()};return r});
require(["main"]);
}());