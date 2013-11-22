ko.extenders.numeric = function(target, precision) {
    //create a writeable computed observable to intercept writes to our observable
    var result = ko.computed({
        read: target,  //always return the original observables value
        write: function(newValue) {
            var current = target(),
                roundingMultiplier = Math.pow(10, precision),
                newValueAsNum = isNaN(newValue) ? 0 : parseFloat(+newValue),
                valueToWrite = Math.round(newValueAsNum * roundingMultiplier) / roundingMultiplier;
 
            //only write if it changed
            if (valueToWrite !== current) {
                target(valueToWrite);
            } else {
                //if the rounded value is the same, but a different value was written, force a notification for the current field
                if (newValue !== current) {
                    target.notifySubscribers(valueToWrite);
                }
            }
        }
    }).extend({ notify: 'always' });
 
    //initialize with current value to make sure it is rounded appropriately
    result(target());
 
    //return the new computed observable
    return result;
};

ko.extenders.currency = function (target, configArray) {
    var precision = configArray[0],
        rawValueObservable = configArray[1] || ko.observable();
    //create a writeable computed observable to intercept writes to our observable
    var result = ko.computed({
        read: target,  //always return the original observables value
        write: function (newValue) {
            var current = target(),
                cleansedValue = parseFloat(newValue.toString().replace(/[^\d.-]/g, '')),
                newValueAsNum = isNaN(cleansedValue) ? 0 : parseFloat(+cleansedValue),
                isNegativeValue = newValueAsNum < 0 ? true : false,
                valueToFormat = parseFloat(newValue.toString().replace(/[^\.\d]/g, '')),
                formattedValue = valueToFormat.formatMoney(precision),
                valueToWrite = isNegativeValue ? '($' + formattedValue + ')' : '$' + formattedValue;

            //only write if it changed
            if (valueToWrite !== current) {
                rawValueObservable(newValueAsNum);
                target(valueToWrite);
            } else {
                //if the rounded value is the same, but a different value was written, force a notification for the current field
                if (newValue !== current) {
                    target.notifySubscribers(valueToWrite);
                }
            }
        }
    }).extend({ notify: 'always' });

    //initialize with current value to make sure it is rounded appropriately
    result(target());

    //return the new computed observable
    return result;
};
