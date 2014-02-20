var DEBUG = 0x00,
    INFO = 0x01,
    WARN = 0x02,
    ERROR = 0x04;

if (!window.console) {
    var methods = ["debug", "info", "warn", "error"];
    var messageFunction = function(message) {return message;};
    window.console = {};
    imMatch.each(methods, function(i, method) {
        window.console[method] = messageFunction;
    });
}
else {
    if (!("log" in window.console)) {
        window.console.log = function(message) {return message;};
    }
    if (!("debug" in window.console)) {
        window.console.debug = function(message) {console.log(message);};
    }
    if (!("info" in window.console)) {
        window.console.info = function(message) {console.log(message);};
    }
    if (!("warn" in window.console)) {
        window.console.warn = function(message) {console.log(message);};
    }
    if (!("error" in window.console)) {
        window.console.error = function(message) {console.log(message);};
    }
}

imMatch.extend({
    logDebug: function(message) {
        if (message && this.logLevel <= DEBUG)
            window.console.debug("[Debug] " + Date() + " : " + message);

        return this;
    },

    logInfo: function(message) {
        if (message && this.logLevel <= INFO)
            window.console.info("[Info] " + Date() + " : " + message);

        return this;
    },

    logWarn: function(message) {
        if (message && this.logLevel <= WARN)
            window.console.warn("[Warn] " + Date() + " : " + message);

        return this;
    },

    logError: function(message) {
        if (message && this.logLevel <= ERROR)
            window.console.error("[Error] " + Date() + " : " + message);

        return this;
    },

    logLevel: ERROR
});
