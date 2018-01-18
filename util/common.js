exports.capitalizeFirstLetter = function(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

exports.formatNumberLength = function(number, length) {
    var numberString = "" + number;
    while (numberString.length < length) {
        numberString = "0" + numberString;
    }
    return numberString;
};
