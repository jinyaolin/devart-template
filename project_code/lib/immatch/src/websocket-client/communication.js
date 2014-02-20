this.imMatch.Communication = imMatch.EventBased.extend({
    init: function(scene, parentNode) {
        this._super();
        this._scene = scene;
        this._parent = parentNode;
        
        this._socket = null;
        this._packetCache = imMatch.PacketCache(this);
        this._frameOffset = 0;
        this._currentChunk = 0; // unit: frame
        this._chunkSize = imMatch.Config.chunkSize;
        this._numSyncedAt = {};
        this._touchOrder = 0;
        this._imageProgress = 1.0;
        this._serverSync = 0;
        this._spritesAllReady = true;
        this._numExchangeData = 0;
        this._numSpritesAllReady = 0;
        this._numDisconnect = 0;
        
        this._initHandlers();
        this._connect();
        
        // =============== Experiment ===============
        this._stitchingPoint = {x: 0, y:0};
        // ========================================== 
    }, 
    
    // Initialize default event handlers
    _initHandlers: function() {
        // Update
        this._bindDefault("update", this._update);
    },
    
    _connect: function() {
        // For Firefox 
        if (window.MozWebSocket)
            window.WebSocket = window.MozWebSocket;
        
        if (window.WebSocket == null) {
            this.error("The browser does not support WebSocket.");
        }
        else {
            if (this._socket == null) {
                this._socket = new WebSocket(imMatch.Config.webSocketURL);

                var that = this;
                this._socket.onopen = function() {
                    that.trace(
                        "connectionStatus" + that._scene.viewport.deviceId,
                        "Connection Status: Connected.");

                    var JSONText = JSON.stringify({
                        action: "connect", 
                        deviceId: that._scene.viewport.deviceId,
                        viewportSize: { 
                            width: that._scene.viewport.width,
                            height: that._scene.viewport.height
                            }
                        });
                    if (this.readyState == 1)
                        this.send(JSONText);
                };
                
                this._socket.onmessage = function(msg) {
                    var message = msg.data;
                    that._parsePacket(message);
                };
                
                this._socket.onclose = function(event) {
                    that.log("Socket closes.");
                };
                
                this._socket.onerror = function(event) {
                    that.error("Socket error.");
                };
            }
        }
    }, 
    
    _parsePacket: function(msg) {
        try{
            var data = JSON.parse(msg);
        }
        catch (e) {
            this.error("Unknown packet: " + msg);
            return;
        }
        switch(data.action) {
        case "connectionSuccess":
            this._processConnectSuccess(data);
            break;
        case "synchronize":
            this._processsynchronize(data);
            break;
        case "stitchStart":
            this._processStitchSuccess(data);
            break;
        case "idle":
            this._processIdle(data);
            break;
        case "exchangeData":
            this._processExchangeData(data);
            break;
        case "exchangeDataDone":
            this._processexchangeDataDone(data);
            break;
        case "unstitchStart":
            this._disconnect(data);
            break;
        case "unstitchDone":
            this._disconnectSuccess(data);
        default:
            break;
        }
    },
    
    _processConnectSuccess: function(data) {
        this._scene.viewport.deviceId = data.deviceID;

        this._frameOffset = 0;
        this._scene.viewport.x = 0;
        this._scene.viewport.y = 0;
        this._scene.viewport.rad = 0;
        /* Old
        this._frameOffset = data.frameOffset;
        this._scene.viewport.x = data.viewportInfo.x;
        this._scene.viewport.y = data.viewportInfo.y;
        this._scene.viewport.rad = data.viewportInfo.rad;*/
        
        var frames = this._scene.numFrames + this._frameOffset;
        this._currentChunk = Math.floor(frames  / this._chunkSize) * this._chunkSize;
        
        this._scene.trigger("onconnect", {broadcast: true});
    },
    
    _processsynchronize: function(data) {
        if (data.executeChunk < this._currentChunk + this._chunkSize) {
            this.error("Packet not in order:\n" + 
                "Execute chunk = " + data.executeChunk + "\n" + 
                "Current chunk = " + this._currentChunk);
            return;
        }
        
        this._packetCache.addPacketWithType(data.touchPoints, "touchSync");
        this._packetCache.addPacketWithType(data, "synchronize");
        this._minImageProgress = Math.min(this._minImageProgress, data.imageProgress);
        if (typeof(this._numSyncedAt[data.executeChunk]) == "undefined")
            this._numSyncedAt[data.executeChunk] = 1;
        else
            ++this._numSyncedAt[data.executeChunk];
    },
    
    _processStitchSuccess: function(data) {
        this.trace("Stitching", "Stitching Successes!");
        this._packetCache.addPacketWithType(data, "stitchData");
        this._serverSync = data.executeChunk;
        
        var stitchingPoint = this._scene.viewport.
                local2Global(this._stitchingPoint.x, this._stitchingPoint.y);
        this._scene.trigger("stitchstart", {
            broadcast: true,
            myStitchingDeviceId: data.stitchDeviceID,
            stitchingDeviceId: data.matchStitchDeviceID,           
            stitchingPoint: {
                x: stitchingPoint.x - data.margin.x,
                y: stitchingPoint.y - data.margin.y
            }
        });
    },
    
    _processIdle: function(data) {
        this._serverSync = data.executeChunk;
    },
    
    _processExchangeData: function(data) {
        this._packetCache.addPacketWithType(data, "exchangeData");
        ++this._numExchangeData;
        this.trace("Stitching", "Get Exchange Data: " + this._numExchangeData);
    },
    
    _processexchangeDataDone: function(data) {
      //  ++this._numSpritesAllReady;
        var stitchData = this._packetCache.getPacketsWithChunk("stitchData");
     //   if (this._numSpritesAllReady != stitchData.deviceIDs.length + stitchData.matchDeviceIDs.length)
     //       return;

        this._packetCache.removePacketsBeforeChunk("stitchData");
        
        var exchangeData = this._packetCache.pullPacketsAtFrame("exchangeData");
        for (var i = 0; i < exchangeData.length; ++i) {
            // Add viewport
            var syncViewport = imMatch.Viewport(
                this._scene, this._scene);

            syncViewport.deserialize(exchangeData[i].viewport);
            this._scene.viewports.push(syncViewport);
            
            // Add sprites
            for (var j = 0; j < exchangeData[i].sprites.length; ++j) {
                var sprite = imMatch.Sprite.deserialize(
                    this._scene, this._scene, exchangeData[i].sprites[j]);
                this._scene.sprites[sprite.id] = sprite;
            }
            
            // Add touchPoints
            var touchPoints = exchangeData[i].touchPoints;

            this._packetCache.addPacketWithType(exchangeData[i].touchPoints, "touchSync");
        }
        
        var stitchingPoint = this._scene.viewport.
                local2Global(this._stitchingPoint.x, this._stitchingPoint.y);

        this._scene.trigger("onstitch", {
            broadcast: true,
            myStitchingDeviceId: stitchData.stitchDeviceID,
            stitchingDeviceId: stitchData.matchStitchDeviceID,           
            stitchingPoint: {
                x: stitchingPoint.x - stitchData.margin.x,
                y: stitchingPoint.y - stitchData.margin.y
            }
        });
        
        this._stitchingPoint.x = 0;
        this._stitchingPoint.y = 0;

        this._frameOffset = -this._scene.numFrames;
        var frames = this._scene.numFrames + this._frameOffset;
        this._currentChunk = Math.floor(frames  / this._chunkSize) * this._chunkSize;
        this._numSyncedAt = {};
        
        this._numSpritesAllReady = 0;
        this._spritesAllReady = true;
        
        this.trace("Stitching", "All Sprites are Ready.");
    },
    
    _disconnect: function(data) {
        this.trace("Stitching", "Get Disconnect Data");
        this._packetCache.addPacketWithType(data, "disconnectData");
        this._serverSync = data.executeChunk;
    }, 
    
    _disconnectSuccess: function(data) {
        this._numDisconnect = 0;
        var disData = this._packetCache.getPacketsWithChunk("disconnectData");
        if (disData != null) {
            if (disData.needToRestitch) {
                if (this._scene.viewport.deviceId === disData.groupInfo1.deviceID)  {
                    var localSyncPoint = this._scene.viewport.global2Local(disData.groupInfo1.stitchingPoint.x, 
                        disData.groupInfo1.stitchingPoint.y);
                    var newSyncOrientation = imMatch.Math.rotate(disData.groupInfo1.stitchingOrientation.x, 
                        disData.groupInfo1.stitchingOrientation.y, 0, 0, -this._scene.viewport.rad);
                    var newMargin = imMatch.Math.rotate(disData.groupInfo1.deviceMargin.x, 
                        disData.groupInfo1.deviceMargin.y, 0, 0, -this._scene.viewport.rad);
                       
                    this._scene.viewport.update(0, 0, 0);
                    this.tryToStitch(localSyncPoint, newSyncOrientation, newMargin, disData.groupInfo1.gestureType);
                }
                else {
                    if (this._scene.viewport.deviceId === disData.groupInfo2.deviceId) {
                        var localSyncPoint = this._scene.viewport.global2Local(disData.groupInfo2.stitchingPoint.x, 
                            disData.groupInfo2.stitchingPoint.y);
                        var newSyncOrientation = imMatch.Math.rotate(disData.groupInfo2.stitchingOrientation.x, 
                            disData.groupInfo2.stitchingOrientation.y, 0, 0, -this._scene.viewport.rad);
                        var newMargin = imMatch.Math.rotate(disData.groupInfo2.deviceMargin.x, 
                            disData.groupInfo2.deviceMargin.y, 0, 0, -this._scene.viewport.rad);
                        
                        this.tryToStitch(localSyncPoint, newSyncOrientation, newMargin, disData.groupInfo2.gestureType);
                    }
                }
            }
            else {
                if (this._scene.viewport.deviceId === disData.groupInfo1.deviceID)
                    this._scene.viewport.update(0, 0, 0);
            }

            this._packetCache.removePacketsBeforeChunk("disconnectData");
        }
        
        this.trace("Stitching", "Disconnect Success");
        if (data.triggerEvent) {
            this._scene.trigger("onunstitch", {
                broadcast: true
            });
        }
    },
    
    _update: function(event) {
        var frames = this._scene.numFrames + this._frameOffset;
        this._currentChunk = Math.floor(frames  / this._chunkSize) * this._chunkSize;

        this.trace(
            "groupFrame" + this._scene.viewport.deviceId,
            "Group Frames: " + frames);
        
        // Send synchronize
        if (frames > 0 && frames % this._chunkSize == 0 && this._socket.readyState == 1) {
            var JSONText = JSON.stringify({
                action: "synchronize",
                executeChunk: this._currentChunk + this._chunkSize,
                deviceID: this._scene.viewport.deviceId,
                imageProgress: this._imageProgress,
                touchPoints: this._packetCache.pullPacketsAtFrame("sendTouchSync")
            });
            this._socket.send(JSONText);

            if (typeof(this._numSyncedAt[this._currentChunk]) != "undefined") 
                delete this._numSyncedAt[this._currentChunk];

            this._packetCache.removePacketsBeforeChunk("synchronize", this._currentChunk);
        }
    },
    
    syncNewDevices: function() {
        var frames = this._scene.numFrames + this._frameOffset;
        this._currentChunk = Math.floor(frames  / this._chunkSize) * this._chunkSize;
        
        // Check whether revceived all sprites. Send sprtieReady.
        var stitchData = this._packetCache.getPacketsWithChunk("stitchData");
        if (stitchData != null && this._numExchangeData == stitchData.matchDeviceIDs.length &&
            this._socket.readyState == 1) {
            this._numExchangeData = 0;

            var JSONText = JSON.stringify({
                action: "exchangeDataDone",
                deviceID: this._scene.viewport.deviceId,
                matchDeviceID: stitchData.matchStitchDeviceID
            });
            
            this._socket.send(JSONText);
        }
        
        var data = this._packetCache.getPacketsWithChunk("disconnectData");
        if (data != null && (this._socket.readyState == 1) && this._spritesAllReady == 1 &&
        (this._serverSync == this._currentChunk) && this._numDisconnect == 0) {
            this._numDisconnect = 1;
            if (this._scene.viewport.deviceId === data.groupInfo1.deviceID) {
                var i = 0;
                for (i = this._scene.viewports.length - 1; i >= 0;--i) {
                    if (this._scene.viewports[i] === this._scene.viewport)
                        continue;
     
                    for (var sid in this._scene.sprites) {
                        if (!this._scene.sprites.hasOwnProperty(sid))
                            continue;
                        
                        if (this._scene.sprites[sid].viewportId === this._scene.viewports[i].deviceId)
                            delete this._scene.sprites[sid];
                    }
                    
                    this._scene.viewports.splice(i, 1);
                }
            }
            else {
                var i = 0;
                for (i = this._scene.viewports.length - 1; i >= 0;--i) {
                    if (this._scene.viewports[i].deviceId === data.groupInfo1.deviceID) {
                        for (var sid in this._scene.sprites) {
                            if (!this._scene.sprites.hasOwnProperty(sid))
                                continue;
                            
                            if (this._scene.sprites[sid].viewportId === data.groupInfo1.deviceID)
                                delete this._scene.sprites[sid];
                        }
                        
                        this._scene.viewports.splice(i, 1);
                        break;
                    }
                }
            }
            
            // Generate end touch
            var touches = this._packetCache.getPacketsWithChunk("touchSync");
            touches.sort(function(a, b) {
                return (a.order - b.order);
            });
            for (var i = 0, max = touches.length; i < max; ++i) {
                if (touches[i].type === "end" && touches[i].deviceId === this._scene.viewport.deviceId)
                    continue;
                
                var hasEnd = false;
                for (var j = i + 1; j < max; ++j) {
                    if (touches[i].id === touches[j].id && 
                        (touches[j].type === "end" || touches[j].type === "cancel")) {
                        hasEnd = true;
                        break;
                    }
                }
                
                if (!hasEnd) {
                    this.pushTouchPoint(touches[i].id, touches[i].x, touches[i].y, "end", null);
                }
            }
            
            var JSONText = JSON.stringify({
                action: "unstitchDone",
                deviceID: data.groupInfo1.deviceID
            });
            this._socket.send(JSONText);
            
            this.trace("Stitching", "Disconnect");
        }

        // Try to sync new devices.
        if (!this._spritesAllReady || this._numDisconnect != 0) {
            return false;
        }
        
        var stitchData = this._packetCache.getPacketsWithChunk("stitchData");
        if (stitchData == null || (this._serverSync != this._currentChunk) ||
            (this._socket.readyState != 1))
            return true;

        this._spritesAllReady = false;
        
        this._scene.viewport.update(stitchData.viewportQTY.x, stitchData.viewportQTY.y, stitchData.viewportQTY.rad);

        // Compute ths client needs to send which sprites
        var deviceIds = [];
        imMatch.each(this._scene.viewports, function(i, viewport) {
            deviceIds.push(viewport.deviceId);
        });
        deviceIds.sort();
        
        var label = 0;
        var that = this;
        imMatch.each(deviceIds, function(i, deviceId) {
            if (deviceId == that._scene.viewport.deviceId) {
                label = i;
                return false;
            }
        });
        
        var spriteIds = [];
        imMatch.each(this._scene.sprites, function(sid, sprite) {
            spriteIds.push(sid);
        });
        spriteIds.sort();
        
        // Exchange data
        var serializeSprites = [];
        var tranlate = {
            x: stitchData.viewportQTY.x - this._scene.viewport.x,
            y: stitchData.viewportQTY.y - this._scene.viewport.y
        };

        var numViewports = this._scene.viewports.length;
        imMatch.each(spriteIds, function(i, spriteId) {
            var index = i + 1;
            if (index % numViewports === label) {
                var sprite = that._scene.sprites[spriteId];

                var serializeSprite = sprite.serialize();
                serializeSprite.x += tranlate.x;
                serializeSprite.y += tranlate.y;
                serializeSprites.push(serializeSprite);
            }
        });

        var serializeViewport = this._scene.viewport.serialize();
        serializeViewport.x = stitchData.viewportQTY.x;
        serializeViewport.y = stitchData.viewportQTY.y;
        serializeViewport.rad = stitchData.viewportQTY.rad;
        
        var frames =  this._scene.numFrames + this._frameOffset;
        this._packetCache.updateTouchSync(frames);
        var touchPoints = this._packetCache.getPacketsWithChunk("touchSync");
        
        var JSONText = JSON.stringify({
            action: "exchangeData",
            deviceID: this._scene.viewport.deviceId,
            viewport: serializeViewport,
            sprites: serializeSprites,
            touchPoints: touchPoints
        });
        this._socket.send(JSONText);
        
        this.trace("Stitching", "Send Exchange Data");
        
        return this._spritesAllReady;
    },
    
    pushTouchPoint: function(id, x, y, type, spriteId) {
        var packet = {
            id: id,
            x: x,
            y: y,
            type: type,
            spriteId: spriteId,
            deviceId: this._scene.viewport.deviceId,
            atFrame: this._scene.numFrames + this._frameOffset + this._chunkSize * 2,
            order: this._touchOrder
        };
        this._packetCache.addPacketWithType(packet, "sendTouchSync");
        ++this._touchOrder;
    },
    
    pullTouchPoints: function() {
        return this._packetCache.pullPacketsAtFrame("touchSync", this._scene.numFrames + this._frameOffset);
    },
    
    getPacketCache: function() {
        return this._packetCache;
    },
    
    setImageProgress: function(progress) {
        this._imageProgress = progress;
    },
    
    getImageProgress: function() {
        var packets = this._packetCache.getPacketsWithChunk("synchronize", this._currentChunk);
        var result = 1.0;
        
        for (var i = 0; i < packets.length; i ++)
            result = Math.min(packets[i].imageProgress, result);
        
        return result;
    },
    
    isReady: function() {
        if (this._socket.readyState != 1) {
            this.trace(
                "connectionStatus" + this._scene.viewport.deviceId,
                "Connection Status: Not Ready.");

            return false;
        }

        var frames = this._scene.numFrames + this._frameOffset;
        if (frames < this._chunkSize * 2 - 1 ||
            frames % this._chunkSize != this._chunkSize - 1 ||
            (this._numSyncedAt[this._currentChunk + this._chunkSize] == this._scene.viewports.length &&
                this._serverSync == this._currentChunk + this._chunkSize)) {
            this.trace(
                "connectionStatus" + this._scene.viewport.deviceId,
                "Connection Status: Alive.");

            return true;
        }
        else {
            this.trace(
                "connectionStatus" + this._scene.viewport.deviceId,
                "Connection Status: Waiting." + "\n" + 
                "ServerSync: " + this._serverSync + " || " + " Next Chunk: " + (this._currentChunk + this._chunkSize) + "\n" + 
                "Number of Synced: " + this._numSyncedAt[this._currentChunk + this._chunkSize] + " || " + " Number of Viewports: " + this._scene.viewports.length);
                
            return false;
        }
    },
    
    tryToStitch: function(stitchingPoint, stitchingOrientation, margin, gestureType) {
        if (this._socket.readyState == 1 && this._numDisconnect == 0 && this._spritesAllReady == 1) {
            this.trace("Stitching", "Try to Stitch Devices.");
            
            this._stitchingPoint = stitchingPoint;

            var JSONText = JSON.stringify({
                action: "tryToStitch",
                deviceId: this._scene.viewport.deviceId,
                stitchingPoint: this._scene.viewport.local2Global(stitchingPoint.x, stitchingPoint.y),
                deviceMargin: imMatch.Math.rotate(margin.x, margin.y,
                     0, 0, this._scene.viewport.rad),
                stitchingOrientation: imMatch.Math.rotate(stitchingOrientation.x, stitchingOrientation.y,
                     0, 0, this._scene.viewport.rad),
                gestureType: gestureType
            });
            
            this._socket.send(JSONText);
        }
    },
    
    tryToUnstitch: function(deviceId) {
        var numViewports = this._scene.viewports.length;
        if (numViewports <= 1)
            return;

        this.trace("Stitching", "Try to Unstitch.");
        var JSONText = JSON.stringify({
            action: "tryToUnstitch",
            deviceID: deviceId
        });
        
        this._socket.send(JSONText);
    }

});
