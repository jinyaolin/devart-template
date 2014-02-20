// Simple JavaScript Inheritance
// By John Resig http://ejohn.org/
// Modified by Neko
// MIT Licensed.
//
// Inspired by base2 and Prototype.
var initializing = false;
var fnTest = /xyz/.test(function(){xyz;}) ? /\b_super\b/ : /.*/;

// The base Class implementation (does nothing)
this.Class = function(){};

// Create a new Class that inherits from this class
Class.extend = function(prop) {
    var _super = this.prototype;
    
    // Instantiate a base class (but only create the instance,
    // don't run the init constructor)
    initializing = true;
    var prototype = new this();
    initializing = false;
    
    // Copy the properties over onto the new prototype
    for (var name in prop) {
        // Check if we're overwriting an existing function
        prototype[name] = typeof prop[name] == "function" && 
            typeof _super[name] == "function" &&
            fnTest.test(prop[name]) ?
            (function(name, fn){
                return function() {
                    var tmp = this._super;
                    
                    // Add a new ._super() method that is the same method
                    // but on the super-class
                    this._super = _super[name];
                    
                    // The method only need to be bound temporarily, so we
                    // remove it when we're done executing
                    var ret = fn.apply(this, arguments);                
                    this._super = tmp;
                    
                    return ret;
                };
            })(name, prop[name]) :
            prop[name];
    }
    
    // The dummy class constructor
    function Class() {
        // Invoke this method without new operator also works
        if (!(this instanceof arguments.callee)) {
            // Create a object without invoking the constructor
            initializing = true;
            var obj = new arguments.callee();
            initializing = false;

            // Invoke the constructor with arguments
            arguments.callee.apply(obj, arguments);

            return obj;
        }

        // All construction is actually done in the init method
        if (!initializing && this.init)
            this.init.apply(this, arguments);
    }
    
    // Populate our constructed prototype object
    Class.prototype = prototype;
    
    // Enforce the constructor to be what we expect
    Class.prototype.constructor = Class;

    // And make this class extendable
    Class.extend = arguments.callee;
    
    return Class;
};

// The Event and EventBased classes for event-driven objects
this.imMatch.Event = Class.extend({
    init: function(type, data) {
        this.type = type || "unknownevent";
        this.timeStamp = new Date().getTime();
        this.propagation = false;
        this.broadcast = false;
        this.invokeDefault = true;

        // Will be bound later
        this.data = undefined;

        // Copy all properties from data to event object
        if (typeof data != "undefined")
            for (var prop in data)
                if (data.hasOwnProperty(prop))
                    this[prop] = data[prop];
    }
});

this.imMatch.EventBased = Class.extend({
    init: function() {
        this._handlers = {};
        this._defaultHandlers = {};

        // May be provided by its descendants
        this._broadcaster = undefined;
        this._propagator = function(event) {
            if (typeof this._parent != "undefined" &&
                typeof this._parent.trigger == "function") {
                this._parent.trigger(event);
            }
        };

        return this;
    },

    // Attach an event handler to this object
    bind: function(eventType, handler, eventData) {
        return this._bind(this._handlers,
            eventType, handler, eventData, false);
    },

    // Attach an event handler to this object and execute only once
    once: function(eventType, handler, eventData) {
        return this._bind(this._handlers,
            eventType, handler, eventData, true);
    },

    // Remove an event handher
    // 1st form: unbind()
    // 2nd form: unbind(eventType)
    // 3rd form: unbind(eventType, handler)
    unbind: function(eventType, handler) {
        return this._unbind(this._handlers,
            eventType, handler);
    },

    // Attach an default event handler to this object
    _bindDefault: function(eventType, handler, eventData) {
        return this._bind(this._defaultHandlers,
            eventType, handler, eventData, false);
    },

    // Remove an default event handler
    // 1st form: _unbindDefault()
    // 2nd form: _unbindDefault(eventType)
    // 3rd form: _unbindDefault(eventType, handler)
    _unbindDefault: function(eventType, handler) {
        return this._unbind(this._defaultHandlers,
            eventType, handler);
    },

    // Execute all event handler for a given event type
    // 1st form: trigger(eventType, extraParam)
    // 2nd form: trigger(event)
    trigger: function(param1, param2) {
        if (!(param1 instanceof imMatch.Event))
            return this._trigger1(param1, param2);
        else
            return this._trigger2(param1);
    },

    // Propagate a log event
    log: function(message) {
        this.trigger("log", {
            propagation: true,
            message: message
        });
        
        return this;
    },

    // Propagate a warning event
    warning: function(message) {
        this.trigger("warning", {
            propagation: true,
            message: message
        });

        return this;
    },

    // Propagate an error event
    error: function(message) {
        this.trigger("error", {
            propagation: true,
            message: message
        });

        return this;
    },

    // propagate a trace event
    trace: function(id, message) {
        this.trigger("trace", {
            propagation: true,
            id: id,
            message: message
        });

        return this;
    },

    _bind: function(record, eventType, handler, eventData, once) {
        if (typeof record[eventType] == "undefined")
            record[eventType] = [];

        record[eventType].push({
            handler: handler,
            data: eventData,
            once: once
        });

        return this;
    },

    _unbind: function(record, eventType, handler) {
        // 1st form: remove all handlers
        if (typeof eventType == "undefined") {
            for (var prop in record)
                if (record.hasOwnProperty(prop))
                    delete record[prop];

            return this;
        }

        // 2nd form: remove all handlers for specified event type
        if (typeof handler == "undefined") {
            record[eventType] = [];
            return this;
        }

        // 3rd form: Remove specified handler
        var handlers = record[eventType];
        if (typeof handlers != "undefined") {
            var length = handlers.length;
            for (var i = 0; i < length; i ++) {
                if (handlers[i].handler == handler) {
                    handlers.splice(i, 1);
                    break;
                }
            }
        }

        return this;
    },

    _trigger1: function(eventType, extraParam) {
        var extraParam = extraParam || {};
        var event = imMatch.Event(eventType);

        for (var prop in extraParam)
            if (extraParam.hasOwnProperty(prop))
                event[prop] = extraParam[prop];

        return this._trigger2(event);
    },

    _trigger2: function(event) {
        var isBroadcast = event.broadcast;

        this._invoke(this._handlers, event);
        if (event.invokeDefault)
            this._invoke(this._defaultHandlers, event);

        if (event.broadcast && this._broadcaster) {
            var propagation = event.propagation;
            event.propagation = false;
            this._broadcaster(event);
            event.propagation = propagation;
        }

        if (event.propagation && this._propagator) {
            var broadcast = event.broadcast;
            event.broadcast = false;
            this._propagator(event);
            event.broadcast = broadcast;
        }

        event.broadcast = isBroadcast;
        return this;
    },

    _invoke: function(record, event) {
        var handlers = record[event.type];
        if (typeof handlers == "undefined")
            return this;

        for (var i = 0; i < handlers.length; ) {
            event.data = handlers[i].data;
            handlers[i].handler.call(this, event);

            if (handlers[i].once)
                handlers.splice(i);
            else
                i++;
        }

        return this;
    }
});
