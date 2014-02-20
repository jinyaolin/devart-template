this.imMatch.SpriteGesture = imMatch.EventBased.extend({
    init: function(scene, parentNode) {
        this._super();
        this._scene = scene;
        this._parent = parentNode;
        this._stop = false;
        this._tid2Sprite = {};

        this._initHandlers();
    },

    // Initialize default event handlers
    _initHandlers: function() {
        this._bindDefault("update", function(event) {
            this._update(event.timeElapsed);
        });

        this._bindDefault("draw", function(event) {
            this._draw();
        });

        this._bindDefault("moveworld", function(event) {
            this._moveWorld(event.fixFunction);
        });
    },

    // Being called after a new touch event appears
    touch: function(touch) {
        if (this._stop)
            return;

        this._updateCache(touch);

        var sprite = this._tid2Sprite[touch.id];
        if (sprite) {
            sprite.touches[touch.id] = {
                id: touch.id,
                x: touch.x,
                y: touch.y,
                type: touch.type,
                spriteId: touch.spriteId,
                lifeTime: 0
            };

            switch (touch.type) {
            case "start":
                sprite.trigger("touchstart", { touch: touch });
                break;
            case "end":
                sprite.trigger("touchend", { touch: touch });
                break;
            case "cancel":
                sprite.trigger("touchcancel", { touch: touch });
                break;
            case "move":
                sprite.trigger("touchmove", { touch: touch });
                break;
            }

            this._initInfo(sprite);
            this._updatePoints(sprite);
            this._tryToAddPoints(sprite);
        }

        this._clearCache(touch);
    },

    // Update tid2Sprite cache according to a new touch event
    _updateCache: function(touch) {
        var spriteId = touch.spriteId;
        if (touch.type != "start")
            spriteId = this._scene.tid2sid(touch.id);

        if (spriteId == null) {
            this._tid2Sprite[touch.id] = null;
            return;
        }

        this._tid2Sprite[touch.id] =
            this._scene.sprites[spriteId] || null;
    },

    // Remove the touch from tid2Sprite cache if it is the last event
    _clearCache: function(touch) {
        if (touch.type == "end" || touch.type == "cancel") {
            if (typeof this._tid2Sprite[touch.id] != "undefined")
                delete this._tid2Sprite[touch.id];
        }
    },
    
    // Recognize the all the gestures and perform transformations
    _update: function(timeElapsed) {
        if (this._stop)
            return;

        var that = this;
        imMatch.each(this._scene.sprites, function(sid, sprite) {
            // Clear unused touch information after receive
            // "end" or "cancel" touch event
            imMatch.each(sprite.touches, function(tid, touch) {
                if (touch.lifeTime >= 1 &&
                    (touch.type == "end" ||
                     touch.type == "cancel")) {
                    delete sprite.touches[tid];
                }
                else {
                    touch.lifeTime ++;
                }
            });

            // Perform gesture recognize process on all the sprites
            that._initInfo(sprite);
            that._updatePoints(sprite);
            that._updateTime(timeElapsed, sprite);
            that._transformSprite(sprite);
            that._tryToAddPoints(sprite);
        });
    },

    // Display debug points
    _draw: function() {
        if (!imMatch.Config.debug)
            return;

        var colorMap = {
            actived: "green",
            applied: "orange",
            rollback: "red",
            finished: "gray"
        };

        // Print all points
        var that = this;
        imMatch.each(this._scene.sprites, function(sid, sprite) {
            if (typeof(sprite.gesture.points) != "undefined")
                that._drawPoints(sprite.gesture.points, colorMap, 1);
        });
    },

    // Display specified points
    _drawPoints: function(points, colors, alpha) {
        var that = this;
        imMatch.each(points, function(index, point) {
            var color = "black";
            if (typeof colors[point.state] != "undefined")
                var color = colors[point.state];

            that._scene.onGlobalCanvas(function(canvas) {
                that._scene.canvas.drawCircle(
                    point.pos.x, point.pos.y, 0, 1, 0.25, {
                    color: "white",
                    alpha: alpha
                });
    
                that._scene.canvas.drawCircle(
                    point.pos.x, point.pos.y, 0, 1, 0.20, {
                    color: color,
                    alpha: alpha
                });
            });
        });
    },

    // Fix all the position information related to the gesture
    // in sprite objects
    _moveWorld: function(fixFunction) {
        var that = this;
        imMatch.each(this._scene.sprites, function(sid, sprite) {
            that._fixTouches(sprite, fixFunction);
            that._fixGesture(sprite, fixFunction);
        });
    },

    // Fix sprite.touches
    _fixTouches: function(sprite, fixFunction) {
        imMatch.each(sprite.touches, function(tid, touch) {
            fixed = fixFunction(touch.x, touch.y, 0);
            touch.x = fixed.x;
            touch.y = fixed.y;
        });
    },

    // Fix sprite.gesture
    _fixGesture: function(sprite, fixFunction) {
        var gesture = sprite.gesture;
        if (typeof(gesture.points) == "undefined")
            return;

        imMatch.each(gesture.points, function(index, point) {
            var fixed = fixFunction(point.pos.x, point.pos.y, 0);
            point.pos = { x: fixed.x, y: fixed.y };

            var fixed = fixFunction(point.lastPos.x, point.lastPos.y, 0);
            point.lastPos = { x: fixed.x, y: fixed.y };

            var fixed = fixFunction(point.realPos.x, point.realPos.y, 0);
            point.realPos = { x: fixed.x, y: fixed.y };

            var fixed = fixFunction(point.linkPos.x, point.linkPos.y, 0);
            point.linkPos = { x: fixed.x, y: fixed.y };

            var fixed = fixFunction(
                point.origin.x, point.origin.y, point.origin.rad);

            point.origin = {
                x: fixed.x,
                y: fixed.y,
                rad: fixed.rad,
                scale: point.origin.scale
            };
        });
    },

    // Initialize variable needed
    _initInfo: function(sprite) {
        var gesture = sprite.gesture;

        // Initialize variables in sprite.gesture
        if (typeof(gesture.points) == "undefined") {
            gesture.points = [];
            gesture.processed = {};

            gesture.numActived = 0;
            gesture.numApplied = 0;
            gesture.numRollback = 0;
            gesture.numFinished = 0;
        }

        // Check the number of points
        if (gesture.points.length > 2) {
            this._stop = true;
            this.error("(Internal Error) Sprite gesture recognizer " +
                "tracks " + gesture.points.length + " points, " +
                "which is more than 2 points.");
        }
    },
    
    // Update all the points in gesture
    _updatePoints: function(sprite) {
        var gesture = sprite.gesture;
        var touches = sprite.touches;

        if (gesture.points.length == 0)
            return;

        // Update the positions for all actived points
        imMatch.each(gesture.points, function(index, point) {
            var touch = touches[point.touchId];
            point.lastPos = point.realPos;

            if (point.state == "actived" &&
                typeof touch != "undefined") {
                point.pos = { x: touch.x, y: touch.y };
                point.realPos = { x: touch.x, y: touch.y };
            }
        });

        // State transition: "actived" => "rollback" or "applied"
        var length = gesture.points.length;
        for (var i = 0; i < length; i ++) {
            var point = gesture.points[i];
            if (point.state != "actived")
                continue;

            if (typeof(touches[point.touchId]) == "undefined") {
                console.log("(Internal Error) Touch point " +
                    point.touchId + " disappears without any " +
                    "end or cancel event.");

                point.state = "applied";
                point.stateTime = 0;
                gesture.numActived --;
                gesture.numApplied ++;
            }
            else if (touches[point.touchId].type == "cancel") {
                // TODO: Uncomment this after finish rollback action
                /*
                point.state = "rollback";
                point.stateTime = 0;
                gesture.numActived --;
                gesture.numRollback ++;
                */
                point.state = "applied";
                point.stateTime = 0;
                gesture.numActived --;
                gesture.numApplied ++;
            }
            else if (touches[point.touchId].type == "end") {
                point.state = "applied";
                point.stateTime = 0;
                gesture.numActived --;
                gesture.numApplied ++;
            }
        }

        // If there is exactly 1 actived point,
        // move other points with it
        if (gesture.numActived == 1) {
            // Calculate offset
            var offset = { x: 0, y: 0 };
            var length = gesture.points.length;
            for (var i = 0; i < length; i ++) {
                var point = gesture.points[i];
                if (point.state != "actived")
                    continue;

                offset.x = point.realPos.x - point.lastPos.x;
                offset.y = point.realPos.y - point.lastPos.y;
                break;
            }

            // Move points
            var length = gesture.points.length;
            for (var i = 0; i < length; i ++) {
                var point = gesture.points[i];
                if (point.state == "actived")
                    continue;

                point.pos.x += offset.x;
                point.pos.y += offset.y;
            }
        }

        // State transition: "applied" => "finished"
        var scale = null;
        if (gesture.points.length == 2) {
            var originLinks = this._calcOriginLinks(gesture.points);
            scale = this._calcScaling(
                originLinks[0],
                originLinks[1],
                gesture.points[0].pos,
                gesture.points[1].pos);
        }

        if (!sprite.scalable ||
            gesture.points.length == 1 ||
            (scale <= sprite.maxScale + 0.0001 &&
             scale >= sprite.minScale - 0.0001)) {
            var length = gesture.points.length;
            for (var i = 0; i < length; i ++) {
                var point = gesture.points[i];

                if (point.state == "applied") {
                    point.state = "finished";
                    point.stateTime = 0;
                    gesture.numApplied --;
                    gesture.numFinished ++;
                }
            }
        }

        // Remove all points if they are finished
        if (gesture.points.length > 0 &&
            gesture.points.length == gesture.numFinished) {
            gesture.points = [];
            gesture.numFinished = 0;
            sprite.trigger("gestureend");
        }
    },

    // Time elapsed
    _updateTime: function(timeElapsed, sprite) {
        var gesture = sprite.gesture;

        // Increase lifetime and state-time
        var length = gesture.points.length;
        for (var i = 0; i < length; i ++) {
            var point = gesture.points[i];
            point.lifeTime += timeElapsed;
            point.stateTime += timeElapsed;
        }

        // Make animations
        this._makeScalingAnimation(timeElapsed, sprite);
    },

    // Make scaling animations
    _makeScalingAnimation: function(timeElapsed, sprite) {
        var gesture = sprite.gesture;

        if (!sprite.scalable || gesture.points.length != 2)
            return (null);

        // Making scaling-up or scaling-down animations if the
        // size does not match the limit
        var originLinks = this._calcOriginLinks(gesture.points);
        var scale = this._calcScaling(
            originLinks[0],
            originLinks[1],
            gesture.points[0].pos,
            gesture.points[1].pos);

        var scaleDiff = 0;
        var step = imMatch.Config.scalingSpeed * timeElapsed / 50;

        if (scale > sprite.maxScale) {
            scaleDiff = Math.min(Math.max(0.1 * step,
                (scale - sprite.maxScale) * step),
                scale - sprite.maxScale);
        }
        else if (scale < sprite.minScale) {
            scaleDiff = -Math.min(Math.max(0.01 * step,
                (sprite.minScale - scale) * step),
                sprite.minScale - scale);
        }

        if (gesture.numApplied == 1) {
            var pointA = gesture.points[0];
            var pointB = gesture.points[1];
            if (pointA.state == "applied") {
                // Move pointA toward pointB
                pointA.pos.x += (pointB.pos.x - pointA.pos.x) *
                    scaleDiff / scale;
                pointA.pos.y += (pointB.pos.y - pointA.pos.y) *
                    scaleDiff / scale;
            }
            else {
                // Move pointB toward pointA
                pointB.pos.x += (pointA.pos.x - pointB.pos.x) *
                    scaleDiff / scale;
                pointB.pos.y += (pointA.pos.y - pointB.pos.y) *
                    scaleDiff / scale;
            }
        }
        else if (gesture.numApplied == 2) {
            // Scaling from the center of two touch points
            var center = this._calcCenterPos(gesture.points);

            var length = gesture.points.length;
            for (var i = 0; i < length; i ++) {
                var pos = gesture.points[i].pos;
                pos.x -= (pos.x - center.x) * scaleDiff / scale;
                pos.y -= (pos.y - center.y) * scaleDiff / scale;
            }
        }

        return scale;
    },

    // Perform translation, rotation and scaling according the gesture
    _transformSprite: function(sprite) {
        var gesture = sprite.gesture;

        if (gesture.points.length == 0)
            return;

        var target = {
            x: sprite.x,
            y: sprite.y,
            rad: sprite.rad,
            scale: sprite.scale
        };

        // Perform translation part of gesture
        var originLinks = this._calcOriginLinks(gesture.points);
        var center = this._calcCenterPos(gesture.points);
        var startCenter = imMatch.Math.meanXY(originLinks);

        if (sprite.movable) {
            target.x = center.x - startCenter.x;
            target.y = center.y - startCenter.y;
        }

        // Perform rotation part of gesture
        var rad = sprite.rad;
        if (sprite.rotatable) {
            if (gesture.points.length == 1) {
                rad = gesture.points[0].origin.rad;
            }
            else {
                rad = this._calcRotation(
                    originLinks[0],
                    originLinks[1],
                    gesture.points[0].pos,
                    gesture.points[1].pos);
            }
        }

        if (sprite.movable) {
            target.rad = 0;
            this._rotateAt(target, center.x, center.y, rad);
        }
        else {
            target.rad = rad;
        }

        // Perform scaling part of gesture
        var scale = sprite.scale;
        if (sprite.scalable) {
            if (gesture.points.length == 1) {
                scale = gesture.points[0].origin.scale;
            }
            else {
                scale = this._calcScaling(
                    originLinks[0],
                    originLinks[1],
                    gesture.points[0].pos,
                    gesture.points[1].pos);

                if (scale > sprite.maxScale) {
                    var c = 1.5 / (sprite.maxScale *
                        imMatch.Config.scalingOverflow);
                    scale = sprite.maxScale + this._curveFunc(
                        (scale - sprite.maxScale) * c) / c;
                }
                else if (scale < sprite.minScale) {
                    var c = 2 / (sprite.minScale *
                        imMatch.Config.scalingUnderflow);
                    scale = sprite.minScale - this._curveFunc(
                        (sprite.minScale - scale) * c) / c;
                }
            }
        }

        if (sprite.movable) {
            target.scale = 1;
            this._scaleAt(target, center.x, center.y, scale);
        }
        else {
            target.scale = scale;
        }

        sprite.trigger("gesturemove", { x: target.x, y: target.y })
            .trigger("gesturerotate", { rad: target.rad })
            .trigger("gesturescale", { scale: target.scale });
    },

    // Try to add new points
    _tryToAddPoints: function(sprite) {
        var gesture = sprite.gesture;
        var touches = sprite.touches;

        // Clear processed touch records
        // (used to check whether a touch event is new or not)
        for (var tid in gesture.processed) {
            if (!gesture.processed.hasOwnProperty(tid))
                continue;

            if (typeof(touches[tid]) == "undefined")
                delete gesture.processed[tid];
        }

        // Add active points if there are new touches
        for (var tid in touches) {
            if (!touches.hasOwnProperty(tid) ||
                typeof(gesture.processed[tid]) != "undefined" ||
                touches[tid].type == "end" ||
                touches[tid].type == "cancel") {
                continue;
            }

            // Mark the touch event as processed
            // NOTE: Any object except undefined is ok here
            gesture.processed[tid] = null;

            if (gesture.numApplied == 0 &&
                gesture.numRollback == 0 &&
                gesture.numActived < 2) {
                // Add new point if there is no unfinished
                // rollback action and animation
                this._addNewPoint(sprite, touches[tid]);
            }
        }
    },

    // Add a new point to gesture
    _addNewPoint: function(sprite, touch) {
        var gesture = sprite.gesture;

        // Remove non-actived points
        // Do NOT make length a local variable!
        for (var i = 0; i < gesture.points.length;) {
            if (gesture.points[i].state != "actived")
                gesture.points.splice(i, 1);
            else
                i ++;
        }

        gesture.numApplied = 0;
        gesture.numRollback = 0;
        gesture.numFinished = 0;

        // Record current touch position
        gesture.points.push({
            state: "actived",
            lifeTime: 0,
            stateTime: 0,
            touchId: touch.id,
            pos:     { x: touch.x, y: touch.y },
            lastPos: { x: touch.x, y: touch.y },
            realPos: { x: touch.x, y: touch.y },
            linkPos: { x: touch.x, y: touch.y },
            origin: {
                x: sprite.x,
                y: sprite.y,
                rad: sprite.rad,
                scale: sprite.scale
            },
            weight: 1
        });

        gesture.numActived ++;

        if (gesture.points.length == 1) {
            sprite.trigger("gesturestart");
        }
    },

    // Check whether the point with specified touch id exists
    _findPoint: function(points, touchId) {
        var length = points.length;
        for (var i = 0; i < length; i ++) {
            if (points[i].touchId == touchId)
                return i;
        }
        return null;
    },

    // Calculate the position of points if the sprite is
    // at (0, 0) with No rotation and scaling applied to it
    _calcOriginLinks: function(points) {
        var originLinks = [];

        var length = points.length;
        for (var i = 0; i < length; i ++) {
            var point = points[i];

            originLinks.push(imMatch.Math.rotate(
                (point.linkPos.x - point.origin.x) / point.origin.scale,
                (point.linkPos.y - point.origin.y) / point.origin.scale,
                0, 0, -point.origin.rad));
        }

        return (originLinks);
    },

    // Calculate the gravity center position
    _calcCenterPos: function(points) {
        var center = { x: 0, y: 0 };

        var length = points.length;
        for (var i = 0; i < length; i ++) {
            center.x += points[i].pos.x;
            center.y += points[i].pos.y;
        }

        center.x /= points.length;
        center.y /= points.length;

        return (center);
    },

    // Calcualte rotation value
    _calcRotation: function(linkPos1, linkPos2, pos1, pos2) {
        var oldVec = {
            x: linkPos2.x - linkPos1.x,
            y: linkPos2.y - linkPos1.y
        };
        var newVec = {
            x: pos2.x - pos1.x,
            y: pos2.y - pos1.y
        }
    
        return (Math.atan2(newVec.y, newVec.x) -
            Math.atan2(oldVec.y, oldVec.x));
    },

    // Calculate scaling value
    _calcScaling: function(linkPos1, linkPos2, pos1, pos2) {
        var oldDist = Math.max(0.0000001,
            imMatch.Math.distance(
            linkPos1.x, linkPos1.y,
            linkPos2.x, linkPos2.y));
    
        var newDist = Math.max(0.0000001,
            imMatch.Math.distance(
            pos1.x, pos1.y,
            pos2.x, pos2.y));
    
        return (newDist / oldDist);
    },

    // Rotate sprite with specified position as rotation center
    _rotateAt: function(sprite, x, y, rad) {
        var center = imMatch.Math.rotate(
            x, y, sprite.x, sprite.y, rad);

        sprite.x += x - center.x;
        sprite.y += y - center.y;
        sprite.rad += rad;
    },
    
    // Scale sprite with specified position as scaling center
    _scaleAt: function(sprite, x, y, scale) {
        sprite.x += (x - sprite.x) * (1 - scale);
        sprite.y += (y - sprite.y) * (1 - scale);
        sprite.scale *= scale;
    },
    
    // Curve function used for scaling when the sprite reach its min
    // or max size. It has the following properties:
    // - f(0) = 0
    // - f'(0) ~= 1
    // - f(inf) ~= 1
    _curveFunc: function(x) {
        return (-Math.pow(1.2, -(x * 6) + 10) + Math.pow(1.2, 10)) / 6;
    }
    
});
