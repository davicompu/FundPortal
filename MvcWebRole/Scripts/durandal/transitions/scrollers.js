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
define(['durandal/system', 'durandal/composition', 'jquery'], function (system, composition, $) {
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
