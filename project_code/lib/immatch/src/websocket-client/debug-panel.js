this.imMatch.DebugPanel = imMatch.EventBased.extend({
    init: function(canvas, parentNode) {
        this._super();
        this._parent = parentNode;
        this._messages = [];
        this.canvas = canvas;

        this._bindDefault("draw", function(event) {
            this._draw();
        });
    },

    // Draw messages on the canvas
    _draw: function() {
        if (!imMatch.Config.debug || !this.canvas) {
            return;
        }

        // Combine messages into one string
        this._messages.sort(function (a, b) {
            if (a.name < b.name)
                return -1;
            else if (a.name > b.name)
                return 1;
            return 0;
        });

        var msg = "";
        for (var i = 0; i < this._messages.length; i ++)
            msg += (msg ? "\n" : "" ) + this._messages[i].text;

        // Decide message box size
        var textScale = Math.min(
            this.canvas.width * 0.5 / 20,
            this.canvas.height * 0.5 / 20);

        // Draw messages
        this.canvas.drawText(msg,
            0.05 + textScale * 0.05,
            0.15 + textScale * 0.05,
            0.0, 1.0, textScale, "left", "top",
            this.canvas.width, {
                color: "white"
            });

        this.canvas.drawText(msg,
            0.05, 0.15, 0.0, 1.0,
            textScale, "left", "top",
            this.canvas.width, {
                color: "#333333",
            });
    },

    // Add a new message with specified name to message log
    show: function(name, text) {
        name = "" + name;

        for (var i = 0; i < this._messages.length; i ++) {
            if (this._messages[i].name == name) {
                this._messages[i].text = text;
                return;
            }
        }

        this._messages.push({name: name, text: text});
    },

    // Remove a existing message with specified name
    remove: function(name) {
        name = "" + name;

        for (var i = 0; i < this._messages.length; i ++) {
            if (this._messages[i].name == name) {
                this._messages.splice(i, 1);
                return;
            }
        }
    },

    // Remove all messages
    clear: function() {
        this._messages.splice(0, this._messages.length);
    }
});
