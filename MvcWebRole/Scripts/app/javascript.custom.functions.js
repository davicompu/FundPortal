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

Number.prototype.formatMoney = function (c, d, t) {
    var n = this,
        c = isNaN(c = Math.abs(c)) ? 2 : c,
        d = d == undefined ? "." : d,
        t = t == undefined ? "," : t,
        s = n < 0 ? "-" : "",
        i = parseInt(n = Math.abs(+n || 0).toFixed(c)) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
    return s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d + Math.abs(n - i).toFixed(c).slice(2) : "");
};