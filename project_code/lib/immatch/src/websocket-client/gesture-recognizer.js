this.imMatch.GestureRecognizer = imMatch.EventBased.extend({
    init: function(scene, parentNode) {
        this._super();
        this._scene = scene;
        this._parent = parentNode;
        this._spriteGesture = imMatch.SpriteGesture(scene, this);
        this._syncGesture = imMatch.SynchronousGesture(scene, this);
        
        // Process drag evnet the another devices to me
        this._endTouches = [];
        this._thresholdTimeForDrag = 700;
        this._thresholdDis = 2;
        this._boundary = 0.2;

        this._initHandlers();

        var that = this;
        this._scene.canvas.addTouchEventListener(
            function(id, x, y, type) {
                that._onTouch(id, x, y, type);
        });
    },
    
    // Initialize default event handlers
    _initHandlers: function() {
        this._broadcaster = function(event) {
            this._spriteGesture.trigger(event);
            this._syncGesture.trigger(event);
        };

        this._propagator = function(event) {
            this._scene.trigger(event);
        };

        // Update
        this._bindDefault("update", this._update);
    },

    // Touch event listener
    _onTouch: function(id, x, y, type) {
        // Recognize synchronous gestures
        this._syncGesture.recognize(id, x, y, type);
        
        var point = this._scene.viewport.local2Global(x, y);
        var x = point.x;
        var y = point.y;
        
        var spriteId = null;

        switch(type) {
        case "start":
        case "move":
        case "end":
        case "cancel":
            this._scene.communication.pushTouchPoint(
                id, x, y, type, spriteId);
            break;

        default:
            this.error("(Internal Error) " + 
                "Unknown touch event type " +
                "from CanvasWrapper: " + type);
            break;
        }

        // Print out message if there is Cancel event
        if (type == "cancel") {
            this.log("A cancel event appears.");
        }
    },
    
    // Calculate the next state after time elapsed
    _update: function(event) {
        var currentTimestamp = new Date().getTime();

        // Sort touch events by order
        var touches = this._scene.communication.pullTouchPoints();
        touches.sort(function(a, b) {
            return (a.order - b.order);
        });
        
        var length = touches.length;
        if (length != 0) {
            this._scene.trigger("ontouch", {
                broadcast: true,
                x: touches[length-1].x, y: touches[length-1].y
            });
        }

        // Process each touch events
        for (var i = 0; i < touches.length; ++i) {
            var touch = touches[i];

            if (touch.type == "start") {
                var sids = this._scene.orderedSIDs();
                for (var j = sids.length - 1; j >= 0; j --) {
                    if (!this._scene.sprites[sids[j]].touchable)
                        continue;
                        
                    if (this._scene.sprites[sids[j]].isTouched(touch.x, touch.y)) {
                        touch.spriteId = sids[j];
                        break;
                    }
                };
            }
            
            // Process touch from another device to me
            if (this._isInBoundary(touch)) {
                switch (touch.type) {
                case "start":
                    var j = 0;
                    for (j = this._endTouches.length - 1; j >= 0; --j) {
                        if (touch.id != this._endTouches[j].id &&
                            imMatch.Math.distance(touch.x, touch.y, this._endTouches[j].x, this._endTouches[j].y) < this._thresholdDis) {
                            this._spriteGesture.touch({
                                id: touch.id,
                                x: this._endTouches[j].x,
                                y: this._endTouches[j].y,
                                type: "start",
                                spriteId: this._endTouches[j].spriteId
                            });
                            
                            touch.type = "move";
                            touch.spriteId = null;

                            this._endTouches.splice(j, 1);
                            break;
                        }
                    }
                    break;
                case "end": case "cancel":
                    var endTouch = touch;
                    endTouch.timestamp = currentTimestamp;
                    endTouch.spriteId = this._scene.tid2sid(touch.id);
                    this._endTouches.push(endTouch);
                    break;
                default:
                    break;
                }
            }
            
            this._spriteGesture.touch(touch);
        }

        for (var i = this._endTouches.length - 1; i >= 0; --i) {
            if (Math.abs(currentTimestamp - this._endTouches[i].timestamp) > this._thresholdTimeForDrag)
                this._endTouches.splice(i, 1);
        }
    },

    _isInBoundary: function(touch) {
        for (var i = this._scene.viewports.length - 1; i >= 0; -- i) {
            var point = this._scene.viewports[i].global2Local(touch.x, touch.y);
            if ((point.x <= this._boundary && point.x >= 0) || 
                (point.x >= this._scene.viewports[i].width - this._boundary && 
                    point.x <= this._scene.viewports[i].width) ||
                (point.y <= this._boundary && point.y >= 0) ||
                (point.y >= this._scene.viewports[i].height - this._boundary &&
                    point.y <= this._scene.viewports[i].height))
            {
                return true;
            }
        }
        
        return false;
    }
});
