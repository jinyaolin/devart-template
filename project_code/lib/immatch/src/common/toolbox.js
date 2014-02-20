// Function for getting the number of members in an object
this.imMatch.sizeof = function(object) {
    var size = 0; 
    for (var key in object) {
        if (object.hasOwnProperty(key))
            ++size;
    }    

    return size;
};   

// Function for iterating over an array or normal object
this.imMatch.each = function(collection, callback) {
    // If the collection acts like an array
    if (!isNaN(collection.length)) {
        var length = collection.length;
        for (var i = 0; i < length; i ++) {
            if (callback.call(collection, i, collection[i]) === false)
                break;
        }

        return (collection);
    }

    // If the collection is a normal object
    for (var id in collection) {
        if (!collection.hasOwnProperty(id))
            continue;

        if (callback.call(collection, id, collection[id]) === false)
            break;
    }

    return (collection);
};

// Replace the continuous #'s with specified number
this.imMatch.fillNumber = function(string, number) {
    var result = string;

    var slot = null;
    while (slot = result.match(/##*/)) {
        var digits = number.toString();
        while (digits.length < slot[0].length)
            digits = "0" + digits;

        result = result.replace(/##*/, digits);
    }

    return result;
};
