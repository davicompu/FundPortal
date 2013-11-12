/*
Executes click event without 300ms delay on mobile browsers waiting for double-tap
*/
ko.bindingHandlers.fastbutton = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var value = ko.utils.unwrapObservable(valueAccessor());

        if (value) {
            new FastButton(element, function () {
                value(viewModel);
            });
        }
    },
};

/*
Executes href without 300ms delay on mobile browsers waiting for double-tap
*/
ko.bindingHandlers.fastlink = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());

        if (value) {
            new FastButton(element, function () {
                window.location.href = value;
            });
        }
    },
};

/*
Navigates back without 300ms delay on mobile browsers waiting for double-tap
*/
ko.bindingHandlers.fastback = {
    init: function (element, valueAccessor, allBindingsAccessor) {
        var value = ko.utils.unwrapObservable(valueAccessor());

        if (value) {
            new FastButton(element, function () {
                window.history.back();
            });
        }
    },
};

/*
Confirm deletion of a record
*/
ko.bindingHandlers.confirmDelete = {

    init: function (element, valueAccessor, allBindingsAccessor, viewmodel) {
        var value = ko.utils.unwrapObservable(valueAccessor());

        // Bind click event to element and call delete function if user confirms
        $(element).click(function () {
            if (confirm("Are you sure you want to delete this item?")) {
                value(viewmodel);
            }
        });
    },
};

/*
Infinite scroll
*/
ko.bindingHandlers.scroll = {
    updating: true,

    init: function (element, valueAccessor, allBindingsAccessor) {
        var self = this;
        self.updating = true;
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            $(window).off('scroll.ko.scrollHandler');
            self.updating = false;
        });
    },

    update: function (element, valueAccessor, allBindingsAccessor) {
        var props = allBindingsAccessor().scrollOptions;
        var offset = props.offset ? props.offset : '0';
        var loadFunc = props.loadFunc;
        var load = ko.utils.unwrapObservable(valueAccessor());
        var self = this;

        if (load) {
            element.style.display = '';
            $(window).on('scroll.ko.scrollHandler', function () {
                if (($(document).height() - offset <= $(window).height() + $(window).scrollTop())) {
                    if (self.updating) {
                        loadFunc();
                        self.updating = false;
                    }
                } else {
                    self.updating = true;
                }
            });
        } else {
            element.style.display = 'none';
            $(window).off('scroll.ko.scrollHandler');
            self.updating = false;
        }
    }
};

/*
Maintain scroll position on list views
*/
ko.bindingHandlers.scrollPosition = {
    init: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
            $(window).off('scroll.ko.scrollPositionHandler');
        });
    },

    update: function (element, valueAccessor, allBindingsAccessor, viewModel, bindingContext) {
        var load = ko.utils.unwrapObservable(valueAccessor());
        var props = allBindingsAccessor().scrollOptions;

        if (load) {
            $(window).on('scroll.ko.scrollPositionHandler', function () {
                var position = $(window).scrollTop();
                if (position !== 0) {
                    props.positionObservable(position);
                }
            });
        }
    }
};

// Hooks up a form to jQuery Validation
ko.bindingHandlers.validate = {
    init: function (elem, valueAccessor) {
        $(elem).validate();
    }
};

// Controls whether or not the text in a textbox is selected based on a model property
ko.bindingHandlers.selected = {
    init: function (elem, valueAccessor) {
        $(elem).blur(function () {
            var boundProperty = valueAccessor();
            if (ko.isWriteableObservable(boundProperty)) {
                boundProperty(false);
            }
        });
    },
    update: function (elem, valueAccessor) {
        var shouldBeSelected = ko.utils.unwrapObservable(valueAccessor());
        if (shouldBeSelected) {
            $(elem).select();
        }
    }
};

// Makes a textbox lose focus if you press "enter"
ko.bindingHandlers.blurOnEnter = {
    init: function (elem, valueAccessor) {
        $(elem).keypress(function (evt) {
            if (evt.keyCode === 13 /* enter */) {
                evt.preventDefault();
                $(elem).triggerHandler("change");
                $(elem).blur();
            }
        });
    }
};

// Simulates HTML5-style placeholders on older browsers
ko.bindingHandlers.placeholder = {
    init: function (elem, valueAccessor) {
        var placeholderText = ko.utils.unwrapObservable(valueAccessor()),
            input = $(elem);

        input.attr('placeholder', placeholderText);

        // For older browsers, manually implement placeholder behaviors
        if (!Modernizr.input.placeholder) {
            input.focus(function () {
                if (input.val() === placeholderText) {
                    input.val('');
                    input.removeClass('placeholder');
                }
            }).blur(function () {
                setTimeout(function () {
                    if (input.val() === '' || input.val() === placeholderText) {
                        input.addClass('placeholder');
                        input.val(placeholderText);
                    }
                }, 0);
            }).blur();

            input.parents('form').submit(function () {
                if (input.val() === placeholderText) {
                    input.val('');
                }
            });
        }
    }
};