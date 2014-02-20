this.imMatch.MessageDisplay = imMatch.EventBased.extend({
    init: function(canvas, parentNode) {
        this._super();
        this._parent = parentNode;
        this._messages = [];
        this._virtualWidth = 4;
        this._virtualHeight = 4;
        this._spacing = 0.2;
        this._maxWidth = this._virtualWidth - this._spacing * 2;
        this._movingSpeed = 2;
        this._idCounter = 0;
        this.canvas = canvas;

        this._bindDefault("update", function(event) {
            this._update(event.timeElapsed);
        });

        this._bindDefault("draw", function(event) {
            this._draw();
        });
    },

    // Calculate the next state after time elapsed
    _update: function(timeElapsed) {
        if (!this.canvas)
            return;

        this._fillEmptyVars();
        this._makeAnimations(timeElapsed);

        // Time pass, remove outdated messages
        for (var i = 0; i < this._messages.length; ) {
            var message = this._messages[i];

            if (message.duration != "forever") {
                message.duration = Math.max(0.0,
                    message.duration - timeElapsed / 1000);
            }

            if (message.duration != "forever" &&
                message.duration <= 0.0 &&
                message.alpha <= 0.0) {
                this._messages.splice(i, 1);
                continue;
            }

            i ++;
        }
    },

    // Enable the messages by calculating the size for them
    _fillEmptyVars: function() {
        for (var i = 0; i < this._messages.length; i ++) {
            var message = this._messages[i];

            // Calculate height
            if (message.height == null) {
                message.height = this.canvas.measureText(
                    message.text, 0.2, this._maxWidth).height;
            }

            // Calculate y position
            if (message.posY == null) {
                var totalHeight = 0.0;
                for (var j = 0; j < i; j ++) {
                    if (this._messages[j].height == null)
                        continue;

                    totalHeight += this._messages[j].height;
                    totalHeight += this._spacing * 2;
                }

                totalHeight += message.height + this._spacing * 2;
        
                message.posY = (this._virtualHeight < totalHeight ? 0.0 :
                    (this._virtualHeight - totalHeight) / 2) +
                    message.height / 2 + this._spacing;
            }
        }
    },

    // Make animations
    _makeAnimations: function(timeElapsed) {
        // Calculate offset from the top
        var totalHeight = 0;
        for (var i = 0; i < this._messages.length; i ++) {
            if (this._messages[i].height == null)
                continue;

            totalHeight += this._messages[i].height + this._spacing * 2;
        }

        var offsetY = (this._virtualHeight < totalHeight ? 0 :
            (this._virtualHeight - totalHeight) / 2);

        for (var i = 0; i < this._messages.length; i ++) {
            var message = this._messages[this._messages.length - i - 1];
            if (message.height == null || message.posY == null)
                continue;

            // Move messages toward their new position
            var speedThres = this._movingSpeed * timeElapsed / 1000;
            var diffY = offsetY + message.height / 2 +
                this._spacing - message.posY;
            
            if (diffY > 0) {
                message.posY += (diffY > speedThres ?
                    speedThres : diffY);
            }
            else {
                message.posY += (-diffY > speedThres ?
                    -speedThres : diffY);
            }

            offsetY += message.height + this._spacing * 2;

            // Make object appearing or disappearing
            if (message.duration == "forever" ||
                message.duration > 0.0) {
                message.alpha = Math.min(1.0,
                    message.alpha + 2 * timeElapsed / 1000);
            }
            else {
                message.alpha = Math.max(0.0,
                    message.alpha - 2 * timeElapsed / 1000);
            }
        }
    },

    // Draw all messages as message boxes on the canvas
    _draw: function() {
        if (!this.canvas)
            return;

        // Scale the box until it fits the real display
        var scale = Math.min(
            this.canvas.width * 0.6 / this._virtualWidth,
            this.canvas.height / this._virtualHeight);

        for (var i = 0; i < this._messages.length; i ++) {
            var message = this._messages[i];
            if (message.height == null || message.posY == null)
                continue;

            var x = this.canvas.width / 2;
            var y = this.canvas.height / 2 +
                scale * (message.posY - this._virtualHeight / 2);

            var width = scale * (this._maxWidth + this._spacing * 1.2);
            var height = scale * (message.height + this._spacing * 1.2);

            this.canvas.drawRoundedRect(
                x, y, 0, 1, width, height, 0.1 * scale, {
                    color: "black",
                    alpha: message.alpha * 0.8
                });

            this.canvas.drawText(
                message.text, x, y, 0, scale, 0.2, "center", "middle",
                this._maxWidth, {
                    color: "white",
                    alpha: message.alpha
                });
        }
    },

    // Add a log message
    log: function(message) {
        if (!imMatch.Config.debug)
            return;

        this.show(message,
            imMatch.Config.messageLifeTime);
    },

    // Add a warning message
    warning: function(message) {
        if (typeof console == "object")
            console.log("WARNING: " + message);

        this.show("WARNING: " + message,
            imMatch.Config.messageLifeTime);
    },

    // Add an error message
    error: function(message) {
        if (typeof console == "object")
            console.log("ERROR: " + message);

        this.show("ERROR: " + message,
            imMatch.Config.messageLifeTime);
    },

    // Add a new message to message queue
    show: function(text, duration) {
        // Add a new message
        // The nextFrame() will re-calculate its height and y position
        var currId = this._idCounter ++;

        this._messages.push({
            id: currId,
            text: "" + text,
            duration: duration,
            alpha: 1.0,
            height: null,
            posY: null});
            
        return currId;
    },

    // Modify a existing message with specified message ID
    modify: function(id, text, duration) {
        for (var i = 0; i < this._messages.length; i ++) {
            if (this._messages[i].id == id) {
                this._messages[i].text = text;
                
                if (duration != null)
                    this._messages[i].duration = duration;

                // Make the nextFrame() re-calculate its height
                this._messages[i].height = null;
                break;
            }
        }
    },

    // Remove a existing message with specified message ID
    remove: function(id) {
        for (var i = 0; i < this._messages.length; i ++) {
            if (this._messages[i].id == id) {
                this._messages[i].duration = 0;
                break;
            }
        }
    },

    // Remove all messages in the queue
    clear: function() {
        for (var i = 0; i < this._messages.length; i ++)
            this._messages[i].duration = 0;
    }
});
