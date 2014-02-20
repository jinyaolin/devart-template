this.imMatch.Sprite = imMatch.EventBased.extend({
    init: function(scene, parentNode) {
        this._super();
        this._scene = scene;
        this._parent = parentNode;
        this.className = "imMatch.Sprite";

        this.id = "s" + imMatch.Math.randomId();
        this.x = 0;
        this.y = 0;
        this.rad = 0;
        this.scale = 1;
        this.alpha = 1;
        this.zOrder = 0;
        
        this.viewportId = this._scene.viewport.deviceId;
        this.touchable = true;
        this.movable = true;
        this.rotatable = true;
        this.scalable = true;
        this.changeViewportAble = false;
        this.maxScale = 1.0;
        this.minScale = 1.0;
        this.touches = {};
        this.gesture = {};

        this._initHandlers();

        if (this instanceof imMatch.Sprite)
            this.trigger("init");
    }, 

    // Initialize default event handlers
    _initHandlers: function() {
        this._propagator = function(event) {
            this._scene.trigger(event);
        };

        this._bindDefault("gesturemove", function(event) {
            this.x = event.x;
            this.y = event.y;
            
            this.changeViewport();
        });

        this._bindDefault("gesturerotate", function(event) {
            this.rad = event.rad;
        });

        this._bindDefault("gesturescale", function(event) {
            this.scale = event.scale;
        });

        this._bindDefault("moveworld", function(event) {
            var fixed = event.fixFunction(this.x, this.y, this.rad);
            this.x = fixed.x;
            this.y = fixed.y;
            this.rad = fixed.rad;
        });
    },

    // Check whether this sprite is covering the specified point
    isTouched: function(x, y) {
        return false;
    },
    
    global2Sprite: function(x, y) {
        x -= this.x;
        y -= this.y;
        var pos = imMatch.Math.rotate(x, y, 0, 0, -this.rad);
        pos.x /= this.scale;
        pos.y /= this.scale;
        
        return pos;
    },

    serialize: function() {
        return {
            className: this.className,
            id: this.id,
            x: this.x,
            y: this.y,
            rad: this.rad,
            scale: this.scale,
            alpha: this.alpha,
            zOrder: this.zOrder,
            viewportId: this.viewportId,
            touchable: this.touchable,
            movable: this.movable,
            rotatable: this.rotatable,
            scalable: this.scalable,
            changeViewportAble: this.changeViewportAble,
            maxScale: this.maxScale,
            minScale: this.minScale,
            touches: this.touches,
            gestureInfo: this.gestureInfo
        }
    },

    deserialize: function(data) {
        var that = this;
        imMatch.each(data, function(prop, value) {
            that[prop] = value;
        });

        return this;
    },
    
    changeViewport: function() {
        if (!this.changeViewportAble)
            return;
            
        var that = this;
        imMatch.each(this._scene.viewports, function(i, viewport) {
            var point = viewport.global2Local(that.x, that.y);
            if (point.x >= 0 && point.x <= viewport.width &&
                point.y >= 0 && point.y <= viewport.height)
            {
                that.viewportId = viewport.deviceId;
                return false;
            }
        });
    }
});

// Generate a sprite object according to the class name racord
this.imMatch.Sprite.deserialize = function(scene, parentNode, data) {
    var sprite = eval(data.className + "(scene, parentNode)");
    sprite.deserialize(data);

    return sprite;
};

this.imMatch.ImageSprite = this.imMatch.Sprite.extend({
    init: function(scene, parentNode, imageRefs) {
        this._super(scene, parentNode);
        this.className = "imMatch.ImageSprite";
        this.imageRefs = imageRefs || [];

        this._bindDefault("draw", function(event) {
            this._draw();
        });
    },
    
    // Draw the sprite on the canvas
    _draw: function() {
        if (this._missingImage)
            return;

        var that = this;
        imMatch.each(that.imageRefs, function(index, imageRef) {
            var image = that._scene.imageManager.
                getImage(imageRef.imageId);

            if (!image) {
                that.error("ImageSprite uses non-existed image.");
                that._missingImage = true;
                return;
            }
            
            that._scene.onGlobalCanvas(that, function(canvas) {
                canvas.drawImage(image, imageRef.x, imageRef.y,
                    imageRef.rad, imageRef.scale, imageRef.alpha);
            });
        });
    },

    // Check whether this sprite is covering the specified point
    isTouched: function(x, y) {
        if (this._missingImage)
            return;

        for (var i = 0; i < this.imageRefs.length; ++i) {
            var imageRef = this.imageRefs[i];
            var image = this._scene.imageManager.
                getImage(imageRef.imageId);
            
            if (!image) {
                this._missingImage = true;
                return;
            }
            
            var imageDPI = (image.dpi != null) ? image.dpi : 72.0;
            var scale = this.scale * imageRef.scale;
            var rad = this.rad + imageRef.rad;

            var rotatedPoint = imMatch.Math.rotate(
                imageRef.x, imageRef.y, 0, 0, this.rad);
            
            var frame = {
                x: this.x + rotatedPoint.x * this.scale -
                    (image.width * scale / imageDPI) / 2.0,
                y: this.y + rotatedPoint.y * this.scale -
                    (image.height * scale / imageDPI) / 2.0,
                width: image.width * scale / imageDPI,
                height: image.height * scale / imageDPI
            }
            frame.center = {
                x: frame.x + frame.width / 2.0,
                y: frame.y + frame.height / 2.0
            }
            
            var rotatedPoint = imMatch.Math.rotate(
                x, y, frame.center.x, frame.center.y, -rad);
            
            if (rotatedPoint.x >= frame.x &&
                rotatedPoint.x <= frame.x + frame.width &&
                rotatedPoint.y >= frame.y &&
                rotatedPoint.y <= frame.y + frame.height) {
                return true;
            }
        }
        
        return false;
    },
    
    serialize: function() {
        var data = this._super();
        data.imageRefs = this.imageRefs;
        return data;
    }
});

this.imMatch.AnimatedSprite = imMatch.Sprite.extend({
    init: function(scene, parentNode) {
        this._super(scene, parentNode);
        this.className = "imMatch.AnimatedSprite";
        this._animations = {};
        this._currAID = null;
        this._frame = 0;
        this._timeSlot = 0;
        this._stop = false;

        this._bindDefault("update", function(event) {
            this._update(event.timeElapsed);
        });

        this._bindDefault("draw", function(event) {
            this._draw();
        });
    },

    _update: function(timeElapsed) {
        if (this._currAID == null || this._stop)
            return;

        var animation = this._animations[this._currAID];

        // Calculate new frame index
        this._timeSlot += timeElapsed;
        var frameDelta = Math.round(this._timeSlot / animation.delay);
        if (frameDelta <= 0)
            return;

        this._timeSlot = 0;
        this._frame += frameDelta;

        // If reach the end
        var totalFrames = animation.imageIds.length;
        if (this._frame >= totalFrames) {
            if (animation.replay) {
                // Replay
                this._frame %= totalFrames;
            }
            else {
                // Stop
                this._frame = totalFrames - 1;
                if (!this._stop) {
                    this._stop = true;
                    this.trigger("animationstop", {
                        animationId: this._currAID
                    });
                }
            }
        }
    },

    _draw: function() {
        if (this._currAID == null || this._missingImage)
            return;

        var animation = this._animations[this._currAID];
        var imageId = animation.imageIds[this._frame];
        var image = this._scene.imageManager.getImage(imageId);

        if (!image) {
            this._missingImage = true;
            return;
        }

        this._scene.onGlobalCanvas(this, function(canvas) {
            canvas.drawImage(image, 0, 0, 0, 1, 1);
        });
    },

    // Add a new animation with specified name to the animation pool
    // 1st form: addAnimation(id, pattern, imageCount, delay, replay)
    // 2nd form: addAnimation(id, [imageId, ..], delay, replay)
    addAnimation: function(p1, p2, p3, p4, p5) {
        if (typeof p5 != "undefined")
            return this._addAnimation1(p1, p2, p3, p4, p5);
        else
            return this._addAnimation2(p1, p2, p3, p4);
    },

    // addAnimation() 1st form
    _addAnimation1: function(id, pattern, imageCount, delay, replay) {
        var imageIds = [];
        for (var i = 0; i < imageCount; i ++)
            imageIds[i] = imMatch.fillNumber(pattern, i);

        return this._addAnimation2(id, imageIds, delay, replay);
    },

    // addAnimation() 2nd form
    _addAnimation2: function(id, imageIds, delay, replay) {
        this._animations[id] = {
            imageIds: imageIds,
            delay: delay,
            replay: replay
        };
    },

    // Play specified animation
    play: function(id) {
        if (!this._animations[id]) {
            this.error("Cannot play animation '" + id +
                "' for AnimatedSprite: Undefined animation ID.");
            return;
        }

        this._currAID = id;
        this._frames = 0;
        this._timeSlot = 0;
        this._stop = false;
        this.trigger("animationplay", { animationId: id });
    },

    // Pack all data into a single simple object
    serialize: function() {
        var data = this._super();
        data._animations = this._animations;
        data._currAID = this._currAID;
        data._frame = this._frame;
        data._timeSlot = this._timeSlot;
        data._stop = this._stop;

        return data;
    }
});
