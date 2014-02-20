this.imMatch.Engine = imMatch.EventBased.extend({
    init: function(canvas) {
        this._super();
        this._initHandlers();

        this._interval = 1000 / imMatch.Config.frameRate;
        this._totalFrame = 0;
        this._prevFrameTime = new Date().getTime();
        this._panel = imMatch.DebugPanel(null, this);
        this._message = imMatch.MessageDisplay(null, this);
        this._performance = imMatch.Engine.Performance(this, this);
        this.canvas = imMatch.CanvasWrapper(canvas, this);
        this.scenes = [];

        this._panel.canvas = this.canvas;
        this._message.canvas = this.canvas;

        var that = this;
        setTimeout(function() {
            that._timer();
        }, this._interval);
    },
    
    // Initialize default event handlers
    _initHandlers: function() {
        this._broadcaster = function(event) {
            this._panel.trigger(event);
            this._message.trigger(event);
            this._performance.trigger(event);

            imMatch.each(this.scenes, function(index, scene) {
                scene.trigger(event);
            });
        };

        this._bindDefault("update", this._update);
        this._bindDefault("draw", this._draw);
        this._bindDefault("log", function(event) {
            this._message.log(event.message);
        });

        this._bindDefault("warning", function(event) {
            this._message.warning(event.message);
        });

        this._bindDefault("error", function(event) {
            this._message.error(event.message);
        });

        this._bindDefault("trace", function(event) {
            this._panel.show(event.id, event.message);
        });
    },
    
    // Called by the timer
    _timer: function() {
        // Time elapsed
        var currTime = new Date().getTime();
        var timeElapsed = currTime - this._prevFrameTime;

        this.trigger("update", {
            broadcast: true,
            timeElapsed: timeElapsed
        });

        this.trigger("draw", {
            broadcast: true
        });

        this._prevFrameTime = currTime;
        this._totalFrame ++;
        this._updateInterval();

        var that = this;
        setTimeout(function() {
            that._timer();
        }, this._interval);
    },

    _update: function(event) {
        // scenes[] has their own update event, just skip them
        this._panel.trigger(event);
        this._message.trigger(event);
        this._performance.trigger(event);

        event.broadcast = false;
    },
    
    _draw: function(event) {
        // Clear canvas
        this.canvas.clear();

        // Draw everything using painter algorithm
        imMatch.each(this.scenes, function(index, scene) {
            scene.trigger(event);
        });

        this._panel.trigger(event);
        this._message.trigger(event);
        this._performance.trigger(event);

        event.broadcast = false;
    },
    
    _updateInterval: function(event) {
        // Decide whether to speed up or speed down
        // according current system loading
        var delay = 0;
        for (var i = 0; i < this.scenes.length; ++i)
            delay += this.scenes[i].getDelay();

        if (this.scenes.length > 0)
            delay /= this.scenes.length;
            
        if (delay <= 5) {
            // Speed up
            this._interval = Math.max(1, this._interval -
                Math.max(1, Math.round(this._interval * 0.05)));
        }
        else {
            // Speed down
            this._interval = Math.min(1000/10, this._interval +
                Math.max(1, Math.round(this._interval * 0.05)));
        }
    }
});

this.imMatch.Engine.Performance = imMatch.EventBased.extend({
    init: function(engine, parentNode) {
        this._super();
        this._engine = engine;
        this._parent = parentNode;
        this._updateInterval = 0.5; // secs
        this._prevTime = new Date().getTime();
        this._frameCount = 0;
        this._totalDelay = 0;

        this._bindDefault("update", function(event) {
            this._update(event.timeEpalsed);
        });
    },

    _update: function(timeElapsed) {
        var currTime = new Date().getTime();
        this._frameCount ++;

        // Calculate average delay time
        var delay = 0;
        for (var i = 0; i < this._engine.scenes.length; ++i)
            delay += this._engine.scenes[i].getDelay();

        if (this._engine.scenes.length > 0)
            delay /= this._engine.scenes.length;

        this._totalDelay += delay;

        if (currTime - this._prevTime > this._updateInterval * 1000) {
            // Display FPS & delay
            var FPS = this._frameCount /
                (currTime - this._prevTime) * 1000;
            var averageDelay = this._totalDelay / this._frameCount;

            for (var i = 0; i < this._engine.scenes.length; ++ i) {
                var spriteList = "";
                imMatch.each(this._engine.scenes[i].sprites,
                    function(sid, sprite) {
                        if (typeof sprite.className == "undefined")
                            spriteList += "Unknown ";
                        else
                            spriteList += sprite.className + " ";
                    });

                var viewport = this._engine.scenes[i].viewport;
                this.trace("Device Info" + viewport.deviceId,
                    "Device Id: " + viewport.deviceId + "\n" +
                    "Viewport: @ (" +  (viewport.x).toFixed(2) + ", " + (viewport.y).toFixed(2) + 
                    ") & Rad = " + (viewport.rad).toFixed(2) + 
                    " & Size = (" + (viewport.width).toFixed(2) + ", " +  (viewport.height).toFixed(2) + ") \n" +
                    "# Sprites: " + imMatch.sizeof(this._engine.scenes[i].sprites) + "\n" +
                    "Sprites: " + spriteList);
            }

            this.trace("displayInfo",
                "FPS: " + FPS.toFixed(2) + "\n" +
                "Delay: " + averageDelay.toFixed(2));

            // Reset statics
            this._prevTime = currTime;
            this._frameCount = 0;
            this._totalDelay = 0;
        }
    }
});
