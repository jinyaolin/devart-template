var
    // Use the correct document accordingly with window argument (sandbox)
    document = window.document,

    // Map over imMatch in case of overwrite
    _imMatch = window.imMatch,

    // Map over the $$ in case of overwrite
    _$$ = window.$$,

    // Save a reference to some core methods for the sake of performance
    core_push = Array.prototype.push,
    core_splice = Array.prototype.splice,
    core_toString = Object.prototype.toString,
    core_hasOwn = Object.prototype.hasOwnProperty,
    core_slice = String.prototype.slice,
    core_indexOf = Array.prototype.indexOf,
    core_trim = String.prototype.trim,
    core_serialize = JSON.stringify,
    core_deSerialize = JSON.parse,

    // Make sure we trim BOM and NBSP (here's looking at you, Safari 5.0 and IE)
    rtrim = /^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,

    // Define a local copy of imMatch
    imMatch = function(selector) {
        return new imMatch.fn.init(selector);
    };

Function.prototype.getName = function() {
    if ("name" in this)
        return this.name;
    return this.name = this.toString().match(/function\s*([^(]*)\(/)[1];
};

imMatch.fn = imMatch.prototype = {
    constructor: imMatch,
    init: function(selector) {
        // Handle $$(""), $$(null), $$(undefined), $$(false)
        if (!selector) {
            return this;
        }

        // Handle $$(DOMElement)
        if (selector.nodeType) {
            this.element = selector;
            return this;
        }

        // Handle $$(id)
        if (imMatch.type(selector) === "String") {
            this.element = document.getElementById(selector);
        }
        else {
            this.element = selector;
        }

        return this;
    },

    element: ""
};

imMatch.fn.init.prototype = imMatch.fn;

// Merge the contents of two or more objects together into the first object
// If only one argument, the imMatch object itself is assumed to be the target
// Reference: jQuery v1.8.2
imMatch.extend = imMatch.fn.extend = function() {
    var options, name, src, copy, copyIsArray, clone,
        target = arguments[0] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    // Handle a deep copy situation
    if (typeof target === "boolean") {
        deep = target;
        target = arguments[1] || {};
        // skip the boolean and the target
        i = 2;
    }

    // Handle case when target is a string or something (possible in deep copy)
    if (typeof target !== "object" && !imMatch.isFunction(target)) {
        target = {};
    }

    // extend imMatch itself if only one argument is passed
    if (length === i) {
        target = this;
        --i;
    }

    for (; i < length; ++i) {
        // Only deal with non-null/undefined values
        if ((options = arguments[i]) !== null) {
            // Extend the base object
            for (name in options) {
                src = target[name];
                copy = options[name];

                // Prevent never-ending loop
                if (target === copy) {
                    continue;
                }

                // Recurse if we're merging plain objects or arrays
                if (deep && copy && ( imMatch.isPlainObject(copy) || (copyIsArray = imMatch.isArray(copy)))) {
                    if (copyIsArray) {
                        copyIsArray = false;
                        clone = src && imMatch.isArray(src) ? src : [];

                    } 
                    else {
                        clone = src && imMatch.isPlainObject(src) ? src : {};
                    }

                    // Never move original objects, clone them
                    target[name] = imMatch.extend(deep, clone, copy);
                } 
                // Don't bring in undefined values
                else if (copy !== undefined) {
                    target[name] = copy;
                }
            }
        }
    }

    // Return the modified object
    return target;
};

imMatch.extend({
    // Return control of $$ back to the other library
    // Reference: jQuery v1.8.2
    noConflict: function(deep) {
        if (window.$$ === imMatch) {
            window.$$ = _$$;
        }

        if (deep && window.imMatch === imMatch) {
            window.imMatch = _imMatch;
        }

        return imMatch;
    },

    // Return the class of a native object
    classof: function(object) {
        return core_slice.call(core_toString.call(object), 8, -1);
    },

    // Return the type of a native/user-defined object
    type: function(object) {
        var className, name;
        if (object === undefined) 
            return "Undefined";

        if (object === null) 
            return "Null";

        if (object !== object) 
            return "Nan";

        if ((className = imMatch.classof(object)) !== "Object") 
            return className;

        if (object.constructor && imMatch.classof(object.constructor) === "Function" && 
            (name = object.constructor.getName()))
            return name;

        return "Object";
    },

    // Determine if object is a plain object
    // Reference: jQuery v1.8.2
    isPlainObject: function(object) {
        // Must be an Object.
        // Because of IE, we also have to check the presence of the constructor property.
        // Make sure that DOM nodes and window objects don't pass through, as well
        if (!object || imMatch.type(object) !== "Object" || object.nodeType || imMatch.isWindow(object)) {
            return false;
        }

        try {
            // Not own constructor property must be Object
            if ( object.constructor && !core_hasOwn.call(object, "constructor") &&
                !core_hasOwn.call(object.constructor.prototype, "isPrototypeOf") ) {
                return false;
            }
        } catch (error) {
            // IE8,9 Will throw exceptions on certain host objects #9897
            return false;
        }

        // Own properties are enumerated firstly, so to speed up,
        // if last one is own, then all properties are own.
        var key;
        for (key in object) {}

        return key === undefined || core_hasOwn.call(object, key);
    },

    // Determine if object is an array
    isArray: Array.isArray || function(object) {
        return  imMatch.type(object) === "Array";
    },

    // Determine if object is an array-like object
    isArrayLike: function(object) {
        if (object && typeof object === "object" && isFinite(object.length) && 
            object.length >= 0 && object.length === Math.floor(object.length) && 
            object.length < 4294967296)
            return true;
        else
            return false;
    },

    // Determine if object is a function
    isFunction: function(object) {
        return imMatch.type(object) === "Function";
    },

    // Determmine if object is a window
    // Reference: jQuery v1.8.2
    isWindow: function(object) {
        return object !== null && object === object.window;
    },

    // Determine if object is numeric
    // Refernce: jQuery v1.8.2
    isNumeric: function(object) {
        return !isNaN(parseFloat(object)) && isFinite(object);
    },

    // Determine if object is a 2D vector
    is2DVector: function(object) {
        return (imMatch.isNumeric(object.x) && imMatch.isNumeric(object.y));
    },

    // Determine if object is undefined or null
    isEmpty: function(object) {
        return (object === undefined || object === null);
    },

    // Determine if object is {}
    // Refernce: jQuery v1.8.2
    isEmptyObject: function(object) {
        var name;
        for (name in object) {
            return false;
        }
        return true;
    },

    isDOMElement: function(object) {
        return ((imMatch.type(HTMLElement) === "Object")? object instanceof HTMLElement : //DOM2
                object && imMatch.type(object) === "Object" && object.nodeType === 1 && imMatch.type(object.nodeName) === "String");
    },

    // Execute a callback for every element in the elements of array, array-like object, or normal object
    each: function(object, callback, /* Optional */ reverse) {
        var name, i = 0, length = object.length;
        
        if (imMatch.isArrayLike(object)) {
            reverse = reverse || false;
            if (!reverse) {
                for (; i < length;) {
                    if (callback.call(object[i], i, object[i++]) === false) {
                        break;
                    }
                }
            }
            else {
                for (i = length - 1; i >= 0;) {
                    if (callback.call(object[i], i, object[i--]) === false) {
                        break;
                    }
                }
            }
        }
        else {
            for (name in object) {
                if (!core_hasOwn.call(object, name))
                    continue;
                if (callback.call(object[name], name, object[name]) === false) {
                    break;
                }
            }
        }

        return object;
    },

    // Remove a element from a plaint object or an array-like object
    remove: function(object, name) {
        if (!object || imMatch.isEmpty(name)) {
            return object;
        }
        
        if (imMatch.isArray(object)) {
            core_splice.call(object, name, 1);
        }
        else if (imMatch.isPlainObject(object)) {
            delete object[name];
        }

        return object;
    },

    // Reference jQuery v1.8.2
    makeArray: function(arr, /* Internal */ results) {
        var type, ret = results || [];
        if (arr != null) {
            if (imMatch.isArrayLike(arr)) {
                core_push.call(ret, arr);
            }
            else {
                imMatch.merge(ret, arr);
            }
        }

        return ret;
    },

    // Reference jQuery v1.8.2
    merge: function(first, second) {
        var l = second.length, i = first.length, j = 0;
        if (typeof l === "number") {
            for (; j < l; j++) {
                first[i++] = second[j];
            }
        } 
        else {
            while (second[j] !== undefined) {
                first[i++] = second[j++];
            }
        }

        first.length = i;

        return first;
    },

    // Reference: jQuery v1.8.2
    trim: core_trim && !core_trim.call("\uFEFF\xA0") ?
        function(text) {
            return (imMatch.isEmpty(text))? "" : core_trim.call(text);
        } :
        function(text) {
            return (imMatch.isEmpty(text))? "" : (text + "").replace(rtrim, "");
        },

    // Return the current time in milliseconds
    now: Date.now || function() {
        return (new Date()).getTime();
    },

    error: function(message) {
        throw new Error(message);
    },

    hideAddressBar: function() {
        imMatch(window).on("load",function() {
            setTimeout(function(){
                // Hide the address bar!
                window.scrollTo(0, 1);
            }, 0);
        });
    }
});

function returnFalse() {
    return false;
}

function returnTrue() {
    return true;
}
