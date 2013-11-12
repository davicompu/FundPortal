String.prototype.removeMultipleWhitespaces = function () {
    return this.replace(/\s\s+/g, ' ');
};

String.prototype.cleanSearchString = function () {
    var searchString = this.removeMultipleWhitespaces();

    // Generate array, removing all characters except alphanumeric, whitespace, and double-quotes
    return searchString.match(/(?:[^\s"]+|"[^"]*")+/g);
};

String.prototype.generateKeywordArray = function () {
    var inputString = this.removeMultipleWhitespaces();
    inputString = inputString.toLocaleLowerCase();

    // Generate array removing all characters except alphanumeric and apostrophes
    return inputString.match(/[a-zA-Z\d']+/g);
};

Array.prototype.removeDuplicateValues = function () {
    return this.filter(function (elem, pos, self) {
        return self.indexOf(elem) == pos;
    });
}