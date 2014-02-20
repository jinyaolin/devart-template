this.imMatch.Scene = imMatch.EventBased.extend({
    // 1st form: Scene(engine)
    // 2nd form: Scene(canvas, parentNode)
    init: function(canvas, parentNode) {
        this._super();

        if (canvas instanceof imMatch.Engine) {
            var engine = canvas;
            this._parent = parentNode ? parentNode : engine;
            this.canvas = engine.canvas;
        }
        else {
            this._parent = parentNode;
            this.canvas = canvas;
        }

        this.viewport = imMatch.Viewport(this, this);
        this.viewport.x = 0;
        this.viewport.y = 0;
        this.viewport.width = this.canvas.width;
        this.viewport.height = this.canvas.height;

        this.sprites = {};
        this.viewports = [this.viewport];
        this.imageManager = imMatch.ImageManager(this, this);
        this.gestureRecognizer = imMatch.GestureRecognizer(this, this);
        this.communication = imMatch.Communication(this, this);
        this.numFrames = 0;
        
        this._interval = 1000 / imMatch.Config.frameRate;
        this._startTime = new Date().getTime();
        this._prevFrameTime = new Date().getTime();
        this._delay = 0;
        
        this._initHandlers();
        this._update();
    },
    
    // Initialize default event handlers
    _initHandlers: function() {
        // Drawing things on the screen
        this._bindDefault("draw", this._draw);
        
        this._broadcaster = function(event) {
            this.imageManager.trigger(event);
            this.gestureRecognizer.trigger(event);
            this.communication.trigger(event);

            imMatch.each(this.sprites, function(sid, sprite) {
                sprite.trigger(event);
            });
        };
    },
    
    _update: function() {
        var that = this;
        var frameTime = new Date().getTime();
            
       if (!this.communication.syncNewDevices()) {
            setTimeout(function() {
                that._update();
            }, this._interval);
            return;
        }

        // Pause if the network is not ready       
       if (!this.communication.isReady()) {
            // Calculate delay time
            /*this._delay = Math.max(0, frameTime -
                this._prevFrameTime - this._interval);*/
            this._prevFrameTime = frameTime;
            
            setTimeout(function() {
                that._update();
            }, this._interval);
            return;
        }
        
        // Calculate delay time
        var beginTime = new Date().getTime() - this._startTime;
        var idealBeginTime = this.numFrames * this._interval;
        this._delay = Math.max(0, beginTime - idealBeginTime);
        
        this.trigger("update", {
            broadcast: true,
            timeElapsed: this._interval
        });

        // Calculate delay time for next timeout
        this.numFrames ++;
        var endTime = new Date().getTime() - this._startTime;
        var nextFrameTime = this.numFrames * this._interval;
        this._prevFrameTime = frameTime;
        
        setTimeout(function() {
            that._update();
        }, Math.max(1, Math.round(nextFrameTime - endTime)));
    },
    
    _draw: function(event) {
        // Draw progress bar for ImageManager
        if (!this.imageManager.isCompleted()) {
            this.imageManager.drawProgress();
        }
        else {
            // Draw sprites
            var sids = this.orderedSIDs();
            var length = sids.length;
            for (var i = 0; i < length; i ++) {
                this.sprites[sids[i]].trigger(event);
            }

            for (var i = 0; i < length; i ++) {
                this.sprites[sids[i]].trigger("afterdraw", {
                    broadcast: true
                });
            }

            // 'Simulated' broadcast
            this.gestureRecognizer.trigger(event);
            this.imageManager.trigger(event);
            this.communication.trigger(event);
        }
        
        event.broadcast = false;
    },

    // Draw somthing on the canvas via local coordinate
    // 1st form: onLocalCanvas(drawFunction)
    // 2nd form: onLocalCanvas(sprite, drawFunction)
    onLocalCanvas: function(param1, param2) {
        if (typeof param2 == "undefined")
            this._onLocalCanvas1(param1);
        else
            this._onLocalCanvas2(param1, param2);
    },

    _onLocalCanvas1: function(drawFunction) {
        drawFunction(this.canvas);
    },
    
    _onLocalCanvas2: function(sprite, drawFunction) {
        var context = this.canvas.context;
        context.save();
        context.translate(sprite.x, sprite.y);
        context.scale(sprite.scale, sprite.scale);
        context.rotate(sprite.rad);
        context.globalAlpha *= sprite.alpha;

        drawFunction(this.canvas);

        context.restore();
    },
    
    // Draw something on the canvas via global coordinate
    // 1st form: onGlobalCanvas(drawFunction)
    // 2nd form: onGlobalCanvas(sprite, drawFunction)
    onGlobalCanvas: function(param1, param2) {
        if (typeof param2 == "undefined")
            this._onGlobalCanvas1(param1);
        else
            this._onGlobalCanvas2(param1, param2);
    },

    _onGlobalCanvas1: function(drawFunction) {
        var context = this.canvas.context;
        context.save();
        context.translate(
            this.viewport.width / 2,
            this.viewport.height / 2);
        context.rotate(-this.viewport.rad);
        context.translate(
            -this.viewport.x,
            -this.viewport.y);

        drawFunction(this.canvas);

        context.restore();
    },

    _onGlobalCanvas2: function(sprite, drawFunction) {
        var context = this.canvas.context;
        context.save();
        context.translate(
            this.viewport.width / 2,
            this.viewport.height / 2);
        context.rotate(-this.viewport.rad);
        context.translate(
            -this.viewport.x,
            -this.viewport.y);

        context.translate(sprite.x, sprite.y);
        context.scale(sprite.scale, sprite.scale);
        context.rotate(sprite.rad);
        context.globalAlpha *= sprite.alpha;

        drawFunction(this.canvas);

        context.restore();
    },

    addSprite: function(sprite) {
        this.sprites[sprite.id] = sprite;
    },
    
    getDelay: function() {
        // Return the number of frames
        return this._delay / this._interval;
    },
    
    tid2sid: function(touchId) {
        if (touchId == null)
            return null;
            
        for (var sid in this.sprites) {
            if (!this.sprites.hasOwnProperty(sid))
                continue;
                
            var touches = this.sprites[sid].touches;
            if (touches.hasOwnProperty(touchId)) {
                return sid;
            }
        }
        
        return null;
    },

    orderedSIDs: function() {
        // Put all sprite IDs into an array
        var sids = [];
        for (var sid in this.sprites) {
            if (!this.sprites.hasOwnProperty(sid))
                continue;

            sids.push(sid);
        }

        // Sorted by z-order
        var sprites = this.sprites;
        sids.sort(function(a, b) {
            if (sprites[a].zOrder != sprites[b].zOrder)
                return (sprites[b].zOrder - sprites[a].zOrder);
            
            if (sprites[a].id > sprites[b].id)
                return 1;
            else if (sprites[a].id < sprites[b].id)
                return -1;
            return 0;
        });

        return (sids);
    },
    
    getViewportWithId: function(viewportId) {
        var goalViewport = null
        imMatch.each(this.viewports, function(i, viewport) {
            if (viewport.deviceId === viewportId) {
                goalViewport = viewport;
                return false;
            }
        });
        
        return goalViewport;
    }
});
