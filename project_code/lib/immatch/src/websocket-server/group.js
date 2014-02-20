imMatch.Group = function Group(groupID, webSocketServer) {
    // Allow instantiation without the 'new' keyword
    if ( !(this instanceof imMatch.Group) ) {
        return new imMatch.Group(webSocketServer);
    }

    // Private member variables
    var _groupID = groupID, _webSocketServer = webSocketServer, _devices = {}, _length = 0;

    if (imMatch.isEmpty(groupID)) {
        imMatch.error("[imMatch.Group.constructor] NO groupID.");
    }

    if (!webSocketServer) {
        imMatch.error("[imMatch.Group.constructor] NO webSocketServer.");
    }

    // Privileged Methods
    this.getGroupID = function() {return _groupID;}

    this.getDevices = function() {return _devices;}

    this.addDevice = function(deviceID, webSocket, /* Optional */ viewportQTY) {
        if (imMatch.isEmpty(deviceID) || !webSocket) {
            imMatch.logWarn("[imMatch.Group.addDevice] NO deviceID or webSocket.");
            return this;
        }

        viewportQTY = viewportQTY || {x: 0, y: 0, rad: 0};
        webSocket.groupID = _groupID;
        webSocket.deviceID = deviceID;
        _devices[deviceID] = {webSocket: webSocket, viewportQTY: viewportQTY};
        ++_length;

        this.center.x = (this.center.x * (_length - 1) + viewportQTY.x) / _length;
        this.center.y = (this.center.y * (_length - 1) + viewportQTY.y) / _length;

        // Invoke webSocketServer addDeviceCallBack
        _webSocketServer.addDeviceCallback(deviceID, this.getGroupID());

        imMatch.logInfo("[imMatch.Group.addDevice] Add device. deviceID = " + deviceID + 
            ", GroupID = " + _groupID + ", #devices = " + _length);

        return this;
    }

    this.removeDeviceWithID = function(deviceID) {
        if (imMatch.isEmpty(deviceID)) {
            imMatch.logWarn("[imMatch.Group.removeDeviceWithID] NO deviceID");
            return this;
        }

        var temp = {x: _devices[deviceID].viewportQTY.x, y: _devices[deviceID].viewportQTY.y};
        imMatch.remove(_devices, deviceID);
        --_length;
        
        this.center.x = (this.center.x * (_length + 1) + temp.x) / _length;
        this.center.y = (this.center.y * (_length + 1) + temp.y) / _length;

        // Invoke webSocketServer removeDeviceCallback
        _webSocketServer.removeDeviceCallback(deviceID, this.getGroupID());

        imMatch.logInfo("[imMatch.Group.removeDeviceWithID] Remove device. deviceID = " + deviceID + 
            ", GroupID = " + _groupID + ", #devices = " + _length);

        return this;
    }

    this.getLength = function() {return _length;}
};

// Public Methods
imMatch.Group.prototype = {
    constructor: imMatch.Group,

    center: {x: 0, y: 0},

    numSyncAt: {},
    
    stitchInfo: {},

    unstitchInfo: {},

    // Stitch information contains information about matching group
    setStitchInfo: function(stitchInfo) {
        var temp;
        if (!stitchInfo) {
            this.isStitching = returnFalse;
            this.stitchInfo = {};
        }
        else if (!this.isStitching()) {
            this.isStitching = returnTrue;
            this.stitchInfo = stitchInfo;

            imMatch.logInfo("[imMatch.Group.setStitchInfo] Stitch information: deviceID = " + 
                this.stitchInfo.deviceID + ", groupID = " + this.getGroupID());
        }

        return this;
    },

    // UnStitch information contains information about matching group
    setUnstitchInfo: function(groupInfo1, /* Optional */ groupInfo2, /* Optional */ needToRestitch) {
        if (!groupInfo1) {
            this.isUnstitching = returnFalse;
            this.unstitchInfo = {};
        }
        else if (!this.isUnstitching()) {
            groupInfo2 = groupInfo2 || groupInfo1;
            needToRestitch = needToRestitch || false;

            this.unstitchInfo = {
                groupInfo1: groupInfo1,
                groupInfo2: groupInfo2,
                needToRestitch: needToRestitch
            };

            imMatch.logInfo("[imMatch.Group.setUnstitchInfo] Unstitch information: deviceID1 = " + groupInfo1.deviceID + 
                ", deviceID2 = " + groupInfo2.deviceID + ", Need to restitch = " + needToRestitch);
        }

        return this;
    },

    isStitching: returnFalse,

    isUnstitching: returnFalse,

    synchronize: function(data) {
        var bRet = false;

        if (data) {
            // Send ack
            this.broadcast({
                action: "synchronize", 
                executeChunk: data.executeChunk, // unit: frame
                deviceId: data.deviceID,        // TODO: deviceId -> deviceID
                imageProgress: data.imageProgress,
                touchPoints: data.touchPoints
            });

            imMatch.logDebug("[imMatch.Group.synchronize] Receive \"clientSync\" message" + 
                " and broadcast \"clientSync\" message." + " deviceID = " + data.deviceID + 
                ", executeChunk = " + data.executeChunk);

            this.numSyncAt[data.executeChunk] = (this.numSyncAt[data.executeChunk])? 
                                                    this.numSyncAt[data.executeChunk] + 1 : 1;

            if (this.numSyncAt[data.executeChunk] >= this.getLength()) {
                imMatch.remove(this.numSyncAt, data.executeChunk);

                bRet = this.startUnstitch(this.unstitchInfo, data.executeChunk);
                if (!bRet) {
                    bRet = this.startStitch(this.stitchInfo, data.executeChunk);
                }
                if (!bRet) {
                    this.broadcast({
                        action: "idle",
                        executeChunk: data.executeChunk
                    });

                    imMatch.logDebug("[imMatch.Group.synchronize] Broadcast \"idle\" message." + 
                        " deviceID = " + data.deviceID + ", executeChunk = " + data.executeChunk);
                }
            }
        }
        return this;
    },

    // Send data to all devices in the group
    broadcast: function(data, /* Optional */ targets) {
        if (!data) {
            imMatch.logWarn("[imMatch.Group.broadcast] NO data to broadcast.");
            return this;
        }

        targets = targets || this.getDevices();
        var message = core_serialize(data);
        imMatch.each(targets, function(i, target) {
            target.webSocket.send(message);
        });

        return this;
    },

    startUnstitch: function(unstitchInfo, executeChunk) {
        if (!this.isUnstitching() || imMatch.isEmptyObject(unstitchInfo)) {
            return false;
        }

        executeChunk = executeChunk || 0;

        this.broadcast({
            action: "unstitchStart",
            groupInfo1: unstitchInfo.groupInfo1,
            groupInfo2: unstitchInfo.groupInfo2,
            needToRestitch: unstitchInfo.needToRestitch,
            executeChunk: executeChunk
        });

        imMatch.logInfo("[imMatch.Group.startUnstitch] Broadcast \"unstitchStart\" message." + 
            " deviceID1 = " + unstitchInfo.groupInfo1.deviceID + 
            ", deviceID2 = " + unstitchInfo.groupInfo2.deviceID + 
            ", executeChunk = " + executeChunk);

        return true;
    },

    startStitch: function(stitchInfo, executeChunk) {
        if (!this.isStitching() || imMatch.isEmptyObject(stitchInfo)) {
            return false;
        }

        executeChunk = executeChunk || 0;

        var transVariables = this.transform(), deviceIDs, matchDeviceIDs, 
            devices = this.getDevices();

        deviceIDs = this.makeArrayID(devices);
        matchDeviceIDs = this.makeArrayID(stitchInfo.matchDevices);

        imMatch.each(devices, function(deviceID, device) {
            device.webSocket.send(core_serialize({
                action: "stitchStart",
                deviceIDs: deviceIDs,
                matchDeviceIDs: matchDeviceIDs,
                stitchDeviceID: stitchInfo.deviceID,
                matchStitchDeviceID: stitchInfo.matchDeviceID,
                viewportQTY: device.viewportQTY,
                margin: transVariables.margin,
                executeChunk: executeChunk
            }));
        });

        imMatch.logInfo("[imMatch.Group.startStitch] Broadcast \"stitchStart\" message." + 
            " deviceID = " + stitchInfo.deviceID + 
            ", matchDeviceID = " + stitchInfo.matchDeviceID + 
            ", executeChunk = " + executeChunk);

        return true;
    },

    // Return device ID array
    makeArrayID: function(devices) {
        var deviceIDs = [];

        imMatch.each(devices, function(deviceID, device) {
            deviceIDs.push(deviceID);
        });

        return deviceIDs;
    },

    transform: function() {
        if (imMatch.isEmptyObject(this.stitchInfo)) {
            return {rad: 0, margin: 0, point: 0};
        }

        var rad = imMatch.math.rad(this.stitchInfo.orientation, {x:1, y:0}),
            margin = imMatch.math.rotate(this.stitchInfo.margin, rad),
            point = imMatch.math.rotate(this.stitchInfo.point, rad);

        this.translate({x: margin.x - point.x, y: margin.y - point.y});
        this.rotate(rad);

        return {rad: rad, margin: margin, point: point};
    },

    rotate:function(rad) {
        if (!imMatch.isNumeric(rad) || rad === 0) {
            return this;
        }

        var self = this;
        imMatch.each(this.getDevices(), function(i, target) {
            var newViewportQTYxy = imMatch.math.rotate(target.viewportQTY, rad, self.center);

            target.viewportQTY.x = newViewportQTYxy.x;
            target.viewportQTY.y = newViewportQTYxy.y;
            target.viewportQTY.rad += rad;
        });

        return this;
    },

    translate: function(delta) {
        if (!imMatch.is2DVector(delta) || (delta.x === 0 && delta.y === 0)) {
            return this;
        }

        this.center.x += delta.x;
        this.center.y += delta.y;

        imMatch.each(this.getDevices(), function(i, target) {
            target.viewportQTY.x += delta.x;
            target.viewportQTY.y += delta.y;
        });

        return this;
    }
};
