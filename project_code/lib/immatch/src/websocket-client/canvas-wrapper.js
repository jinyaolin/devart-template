this.imMatch.CanvasWrapper = imMatch.EventBased.extend({
    init: function(canvas, parentNode) {
        this._super();
        this._parent = parentNode;
        this._textDPI = 72;
        this._touchEventListeners = [];
        this.info = imMatch.DeviceInfo(this);
        this.wrap(canvas);
    },
    
    // Change current canvas
    wrap: function(canvas) {
        // Remove old event listeners of canvas
        if (this._listenerRemover != null)
            this._listenerRemover();
            
        // Init new canvas
        this.canvas = canvas;
        this.context = canvas.getContext("2d");
        this.context.globalAlpha = 1;
        this.context.setTransform(1, 0, 0, 1, 0, 0);
        this.context.clearRect(0, 0,
            this.canvas.width, this.canvas.height);

        // Decide resolution
        this._canvasDPI = this.info.dpi;
        this._ratio = 1.0;

        var ratio = window.devicePixelRatio;
        if(typeof(ratio) != "undefined" && ratio > 1) {
            this.canvas.width *= ratio;
            this.canvas.height *= ratio
            this._canvasDPI *= ratio;
            this._ratio = ratio;
        }

        this.context.scale(this._canvasDPI, this._canvasDPI);
        this.width = this.canvas.width / this._canvasDPI;
        this.height = this.canvas.height / this._canvasDPI;

        // Check whether device to be used
        if ("createTouch" in document)
            this._initTouchEventListener();
        else
            this._initMouseEventListener();
    },
    
    // Add a touch event listener
    // (If there is no multi-touch support in this machine, it will
    //  turns to be a mouse-event listener)
    addTouchEventListener: function(touchEventListener) {
        this._touchEventListeners.push(touchEventListener);
    },
    
    // Remove a specified touch event listener
    removeTouchEventListener: function(touchEventListener) {
        for (var i = 0; i < this._touchEventListeners.length; ++i) {
            if (this._touchEventListeners[i] === touchEventListener) {
                this._touchEventListeners.splice(i,1);
                break;
            }
        }
    },

    // Invoke all touch event listeners registered by user
    _callTouchEventListeners : function (id, x, y, type) {
        this.trace("touchPoint",
            "Touch Point: " + x.toFixed(3) + ", " + y.toFixed(3));

        for (var i = 0; i < this._touchEventListeners.length; i ++)
            this._touchEventListeners[i](id, x, y, type);
    },
    
    // Add touch event listeners for wrapper
    // (only called when this machine supports multi-touch)
    _initTouchEventListener : function () {
        var wrapper = this;
        
        var onTouch = function (event, type) {
            event.preventDefault();
            
            for (var i = 0; i < event.changedTouches.length; ++ i) {
                touch = event.changedTouches[i];
              
                var offsetLeft = wrapper.canvas.offsetLeft;
                var offsetTop = wrapper.canvas.offsetTop;
                var dpi = wrapper._canvasDPI / wrapper._ratio;
                wrapper._callTouchEventListeners(touch.identifier,
                    (touch.pageX - offsetLeft) / dpi,
                    (touch.pageY - offsetTop) / dpi, type);
            }
        };
        
        var onTouchStart = function (event) { onTouch(event, "start"); };
        var onTouchMove = function (event) { onTouch(event, "move"); };
        var onTouchEnd = function (event) { onTouch(event, "end"); };
        var onTouchCancel = function (event) { onTouch(event, "cancel"); };
        
        this.canvas.addEventListener( "touchstart", onTouchStart, false );
        this.canvas.addEventListener( "touchmove", onTouchMove, false );
        this.canvas.addEventListener( "touchend", onTouchEnd, false );
        this.canvas.addEventListener( "touchcancel", onTouchCancel, false);
        
        this._listenerRemover = function () {
            wrapper.canvas.removeEventListener("touchstart", onTouchStart, false);
            wrapper.canvas.removeEventListener("touchmove", onTouchMove, false);
            wrapper.canvas.removeEventListener("touchend", onTouchEnd, false);
            wrapper.canvas.removeEventListener("touchcancel", onTouchCancel, false);
            wrapper._listenerRemover = null;
        };
    },
    
    // Add mouse event listeners for wrapper
    // (only been called when this machine supports mouse only)
    _initMouseEventListener: function () {
        var wrapper = this;
        var isDrag = false;
        var touchPointId = 0;
        
        var onMouseDown = function (event) {
            event.preventDefault();
            if (event.button != 0)
                return;
                
            touchPointId ++;

            var offsetLeft = wrapper.canvas.offsetLeft;
            var offsetTop = wrapper.canvas.offsetTop;
            var dpi = wrapper._canvasDPI / wrapper._ratio;
            wrapper._callTouchEventListeners(touchPointId,
                (event.pageX - offsetLeft) / dpi,
                (event.pageY - offsetTop) / dpi,
                "start");
                
            isDrag = true;
        }
        
        var onMouseMove = function (event) {
            event.preventDefault();
            if (!isDrag || event.button != 0)
                return;
                
            var offsetLeft = wrapper.canvas.offsetLeft;
            var offsetTop = wrapper.canvas.offsetTop;
            var dpi = wrapper._canvasDPI / wrapper._ratio;
            wrapper._callTouchEventListeners(touchPointId,
                (event.pageX - offsetLeft) / dpi,
                (event.pageY - offsetTop) / dpi,
                "move");
        }
        
        var onMouseUp = function (event) {
            event.preventDefault();
            if (!isDrag)
                return;
                
            var offsetLeft = wrapper.canvas.offsetLeft;
            var offsetTop = wrapper.canvas.offsetTop;
            var dpi = wrapper._canvasDPI / wrapper._ratio;
            wrapper._callTouchEventListeners(touchPointId,
                (event.pageX - offsetLeft) / dpi,
                (event.pageY - offsetTop) / dpi,
                "end");
                
            isDrag = false;
        }
        
        this.canvas.addEventListener("mousedown", onMouseDown, false);
        this.canvas.addEventListener("mousemove", onMouseMove, false );
        this.canvas.addEventListener("mouseup", onMouseUp, false );
        this.canvas.addEventListener("mouseout", onMouseUp, false );
        
        this._listenerRemover = function () {
            wrapper.canvas.removeEventListener("mousedown", onMouseDown, false);
            wrapper.canvas.removeEventListener("mousemove", onMouseMove, false);
            wrapper.canvas.removeEventListener("mouseup", onMouseUp, false);
            wrapper.canvas.removeEventListener("mouseout", onMouseUp, false);
            wrapper._listenerRemove = null;
        };
    },

    // Clear the content of canvas (fill with transparent pixels)
    clear: function() {
        this.context.clearRect(0, 0,
            this.canvas.width, this.canvas.height);
    },

    // Fill all the canvas with specified color
    fillColor: function(color, alpha) {
        this.context.save();

        this.context.globalAlpha *= alpha;
        this.context.fillStyle = color;
        this.context.fillRect(
            0, 0, this.canvas.width, this.canvas.height);

        this.context.restore();
    },
    
    // Draw a specified image 
    drawImage: function(image, x, y, rad, scale, alpha) {
        if (image == null) {
            this.error("Cannot draw a null or" +
                "undefined image onto canvas.");
            return;
        }
                
        this.context.save();
        
        this.context.globalAlpha *= alpha;
        this.context.translate(x, y);
        this.context.rotate(rad);
        this.context.scale(scale, scale);
        
        var dpi = image.dpi ? image.dpi : 72.0;
        var width = image.width / dpi;
        var height = image.height / dpi;

        this.context.drawImage(image,
            -width / 2, -height / 2, width, height);

        this.context.restore();
    },

    // Draw a rectangle 
    drawRect: function(x, y, rad, scale, width, height, param) {
        this.drawRoundedRect(x, y, rad, scale, width, height, 0, param);
    },

    // Draw a circle
    drawCircle: function(x, y, rad, scale, radius, param) {
        this.drawRoundedRect(x, y, rad, scale,
            radius * 2, radius * 2, radius, param);
    },
    
    // Draw a rounded rectangle 
    drawRoundedRect: function(x, y, rad, scale,
        width, height, radius, param) {

        radius = Math.min(radius, width / 2);
        radius = Math.min(radius, height / 2);
        param = this._checkParam(param);
            
        this.context.save();
        this.context.translate(x, y);
        this.context.rotate(rad);
        this.context.scale(scale, scale);
        this.context.translate(-width / 2, - height / 2);

        // Create the rounded rectangle
        this.context.beginPath();
        this.context.moveTo(radius, 0);
        this.context.lineTo(width - radius, 0);
        this.context.arc(width - radius, radius, radius,
            Math.PI * 1.5, Math.PI * 2, false);
        this.context.lineTo(width, height - radius);
        this.context.arc(width - radius, height - radius,
            radius, 0, Math.PI * 0.5, false);
        this.context.lineTo(radius, height);
        this.context.arc(radius, height - radius, radius,
            Math.PI * 0.5, Math.PI, false);
        this.context.lineTo(0, radius);
        this.context.arc(radius, radius, radius,
            Math.PI, Math.PI * 1.5, false);
        this.context.closePath();

        // Draw content
        this.context.fillStyle = param.color;
        this.context.globalAlpha *= param.alpha;
        this.context.shadowColor = param.shadowColor;
        this.context.shadowOffsetX =
            param.shadowOffsetX * this._canvasDPI;
        this.context.shadowOffsetY =
            param.shadowOffsetY * this._canvasDPI;
        this.context.shadowBlur =
            param.shadowBlur * this._canvasDPI;
        this.context.fill();
          
        // Stroke outline
        if (param.strokeWidth > 0) {
            this.context.shadowColor = "rgba(0,0,0,0)";
            this.context.shadowOffsetX = 0;
            this.context.shadowOffsetY = 0;
            this.context.shadowBlur = 0;
            this.context.lineWidth = param.strokeWidth;
            this.context.strokeStyle = param.strokeColor;
            this.context.stroke();
        }

        this.context.restore();
    },

    // Draw the specified text 
    drawText: function(text, x, y, rad, scale,
        fontSize, alignH, alignV, maxWidth, param) {

        // Prevent null or undefined
        text = "" + text; 
        param = this._checkParam(param);
        
        // Split text into lines
        var lines = this._splitIntoLines(text, fontSize, maxWidth);
        var lineHeight = fontSize * this._textDPI * 1.4;

        if (alignV == "top")
            var yPos = 0;
        else if (alignV == "bottom")
            var yPos = -lines.length * lineHeight;
        else // middle
            var yPos = (-lines.length * lineHeight) / 2;

        // Initialize some variables
        this.context.save();
        this.context.translate(x, y);
        this.context.rotate(rad);
        this.context.scale(scale, scale);
        this.context.scale(1 / this._textDPI, 1 / this._textDPI);

        this.context.font = fontSize * this._textDPI + "pt Arial";
        this.context.textAlign = alignH;
        this.context.textBaseline = "top";
        this.context.globalAlpha *= param.alpha;
        
        // Stroke outline
        if (param.strokeWidth > 0) {
            this.context.shadowColor = "rgba(0,0,0,0)";
            this.context.shadowOffsetX = 0;
            this.context.shadowOffsetY = 0;
            this.context.shadowBlur = 0;
            this.context.lineWidth = param.strokeWidth * this._textDPI;
            this.context.strokeStyle = param.strokeColor;

            for (var i = 0; i < lines.length; i ++) {
                this.context.strokeText(
                    lines[i], 0, yPos + i * lineHeight);
            }
        }

        // Draw text
        this.context.fillStyle = param.color;
        this.context.shadowColor = param.shadowColor;
        this.context.shadowOffsetX =
            param.shadowOffsetX * this._canvasDPI;
        this.context.shadowOffsetY =
            param.shadowOffsetY * this._canvasDPI;
        this.context.shadowBlur =
            param.shadowBlur * this._canvasDPI;

        for (var i = 0; i < lines.length; i ++) {
            this.context.fillText(
                lines[i], 0, yPos + i * lineHeight);
        }

        this.context.restore();
    },

    // Measure the space which is needed when drawing the
    // specified text 
    measureText: function(text, fontSize, maxWidth) {
        // Prevent null or undefined
        text = "" + text;

        // Split text into lines
        var lines = this._splitIntoLines(text, fontSize, maxWidth);
        var lineHeight = fontSize * this._textDPI * 1.4;
        var maxWidth = 0;

        this.context.save();
        this.context.font = fontSize * this._textDPI + "pt Arial";

        // Measure text width for each line
        for (var i = 0; i < lines.length; i ++) {
            maxWidth = Math.max(maxWidth,
                this.context.measureText(lines[i]).width);
        }

        this.context.restore();

        return {
            width: maxWidth / this._textDPI,
            height: lines.length * lineHeight / this._textDPI
        };
    },

    // Check the appearance parameters, fill the empty one
    _checkParam: function(param) {
        var newParam = {
            color: "black",
            alpha: 1,
            strokeWidth: 0,
            strokeColor: "black",
            shadowColor: "rgba(0,0,0,0)",
            shadowOffsetX: 0,
            shadowOffsetY: 0,
            shadowBlur: 0
        };

        // Copy properties from param if it exists
        for (var id in param) {
            if (!param.hasOwnProperty(id))
                continue;

            newParam[id] = param[id];
        }

        return (newParam);
    },
    
    // Internal function which is used by measureText and drawText
    //
    // (This function is reduntant? The built-in measureText() and
    //  drawText() from original canvas is really s*cks, they can't even
    //  handle new-line symbol and more, so we have to write our own
    //  version.)
    _splitIntoLines : function(text, fontSize, maxWidth) {
        maxWidth = maxWidth * this._textDPI;

        // Group text into chunks
        var chunks = [];
        var scanPos = 0;
        while (scanPos < text.length) {
            if (text[scanPos].match(/[_a-z0-9]/i) == null) {
                chunks.push(text[scanPos ++]);
            }
            else {
                var chunk = "";
                while (scanPos < text.length &&
                    text[scanPos].match(/[_a-z0-9]/i) != null) {
                    chunk += text[scanPos ++];
                }
                chunks.push(chunk);
            }
        }

        // Splite chunks into lines
        var lines = [];
        var chunkPos = 0;

        this.context.save();
        this.context.font = fontSize * this._textDPI + "pt Arial";

        while (chunkPos < chunks.length) {
            var line = "";
            var lineSize = 0;

            while (chunkPos < chunks.length) {
                if (chunks[chunkPos] == "\n") {
                    chunkPos ++;
                    break;
                }

                var chunkSize =
                    this.context.measureText(chunks[chunkPos]).width;

                // Check whether the line is too long
                if (chunkSize > maxWidth) {

                    // If it is one character, just skip it
                    if (chunks[chunkPos].length == 1) {
                        chunkPos ++;
                        continue;
                    }

                    // Break the chunk
                    var longChunk = chunks[chunkPos];
                    var scanPos = 0;
                    var subChunks = [];

                    while (scanPos < longChunk.length) {
                        var subChunk = longChunk[scanPos ++];
                        var subChunkSize =
                            this.context.measureText(subChunk).width;

                        while (scanPos < longChunk.length) {
                            var charSize = this.context.measureText(
                                longChunk[scanPos]).width;

                            if (subChunkSize + charSize > maxWidth)
                                break;

                            subChunk += longChunk[scanPos ++];
                            subChunkSize += charSize;
                        }

                        subChunks.push(subChunk);
                    }

                    chunks.splice(chunkPos, 1);
                    subChunks = chunks.splice(0,
                        chunkPos).concat(subChunks);
                    chunks = subChunks.concat(chunks);
                    continue;
                }

                if (lineSize + chunkSize > maxWidth)
                    break;

                line += chunks[chunkPos ++];
                lineSize += chunkSize;
            }

            lines.push(line);
        }

        this.context.restore();
        return (lines);
    }
});
