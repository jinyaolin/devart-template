// Include WebSocketServer and child_process
var WebSocketServer = require("ws").Server;

// Levels: DEBUG, INFO, WARN, ERROR
imMatch.logLevel = INFO;

imMatch.webSocketServer = new WebSocketServer({port: 8080, host:null});

// Add methods and properties to imMatch.webSocketServer
(function(server) {
// Private member variables
var _groupID = 0, _deviceID = 0;

imMatch.extend(server, {
    // Lifetime about candidate
    LIFETIME_CANDIDATE: 700,

    // Maintain stitching groups: each group shares the same virtual space
    groups: {},

    // Device ID -> group ID
    device2group: {},

    // Maintain candidates trying to stitch the others (as queue)
    candidates: [],

    getGroupID: function() {return _groupID++;},

    getDeviceID: function() {return _deviceID++;},

    addDeviceCallback: function(deviceID, groupID) {
        this.device2group[deviceID] = groupID;
        return this;
    },

    removeDeviceCallback: function(deviceID, groupID) {
        imMatch.remove(this.device2group, deviceID);
        if (this.groups[groupID].getLength() === 0) {
            imMatch.remove(this.groups, groupID)
            imMatch.logInfo("[imMatch.webSocketServer.removeDeviceCallback] Remove group. groupID = " + groupID);
        }

        return this;
    },

    addGroup: function(webSocket, /* Optional */ deviceID) {
        var group, groupID;
        if (!webSocket) {
            imMatch.logWarn("[imMatch.webSocketServer.addGroup] NO webSocket.");
            return this;
        }

        try {
            groupID = this.getGroupID();
            group = new imMatch.Group(groupID, this);
            deviceID = deviceID || this.getDeviceID();

            group.addDevice(deviceID, webSocket);
            this.groups[groupID] = group;

            webSocket.send(core_serialize({
                action: "connectionSuccess",
                deviceID: deviceID
            }));

            imMatch.logDebug("[imMatch.Group.addGroup] Connection and broadcast \"connectionSuccess\" message." + 
                " deviceID = " + deviceID + ", groupID = " + groupID);

        } catch(error) {
            imMatch.logError("[imMatch.Group.addGroup] " + error.message);
            imMatch.error("[imMatch.Group.addGroup] Adding group fails.");
        }

        return group;
    },

    monitorCandidates: function() {
        var self = this, now = imMatch.now(), i = 0, length = this.candidates.length;
        for (; i < length;) {
            if (Math.abs(now - this.candidates[i].timestamp) > this.LIFETIME_CANDIDATE) {
                imMatch.remove(this.candidates, i);
                --length;
            }
            else {
                ++i;
            }
        }

        setTimeout(function(){self.monitorCandidates();}, this.LIFETIME_CANDIDATE);

        return this;
    },

    // Response received messages
    response: {
        connection: function(webSocket) {
            server.addGroup(webSocket);

            return server;
        },

        close: function(webSocket) {
            imMatch.logInfo("[imMatch.Group.response.close] The client closes WebSocket." + 
                " deviceID = " + webSocket.deviceID + ", groupID = " + webSocket.groupID);

            server.groups[webSocket.groupID].removeDeviceWithID(webSocket.deviceID);
            
            return server;
        },

        error: function(error, webSocket) {
            imMatch.logError("[imMatch.Group.response.error] " + error.message + 
                " deviceID = " + webSocket.deviceID + ", groupID = " + webSocket.groupID);
            imMatch.error("[imMatch.Group.response.error] WebSocket error.");

            return server;
        },

        synchronize: function(data) {
            var groupID;
            if (data) {
                groupID = server.device2group[data.deviceID];
                server.groups[groupID].synchronize(data);
            }

            return server;
        },

        tryToStitch: function(data) {
            var now = imMatch.now(), data1, data1Index, group1, group2,
                i = 0, length = server.candidates.length;
            if (!data) {
                imMatch.logWarn("[imMatch.webSocketServer.tryToStitch] NO data.");
                return server;
            }

            // Wrapper (Remove in the future)
            {
                data.orientation = data.stitchingOrientation;
                data.point = data.stitchingPoint;
                data.margin = data.deviceMargin;
                data.deviceID = data.deviceId;
            }

            imMatch.logInfo("[imMatch.webSocketServer.tryToStitch] DeviceID = " + data.deviceID + ", " + server.candidates.length);

            imMatch.each(server.candidates, function(i, stitchInfo) {
                if (stitchInfo.data.gestureType === data.gestureType && stitchInfo.data.deviceID !== data.deviceID &&
                    Math.abs(now - stitchInfo.timestamp) <= server.LIFETIME_CANDIDATE) {
                    data1 = stitchInfo.data;
                    imMatch.remove(server.candidates, i);
                    return false;
                }   
            }, true);

            if (!data1) {
                imMatch.logInfo("[imMatch.webSocketServer.tryToStitch] No match device");
                // Ensure unique
                for (; i < length;) {
                    if (server.candidates[i].data.deviceID === data.deviceID) {
                        imMatch.remove(server.candidates, i);
                        --length;
                    }
                    else {
                        ++i;
                    }
                }

                core_push.call(server.candidates, {data: data, timestamp: now});
            }
            // Matching devices successes
            else {
                group1 = server.groups[server.device2group[data1.deviceID]];
                group2 = server.groups[server.device2group[data.deviceID]];

                if (group1.isStitching() || group2.isStitching()) {
                    imMatch.logDebug("[imMatch.webSocketServer.tryToStitch] Groups are stitching." + 
                        " groupID1 = " + group1.getGroupID() + ", groupID2 = " + group2.getGroupID());
                    return server;
                }

                // Devices that are in the same group want a new stitch
                if (group1.getGroupID() === group2.getGroupID()) {
                    group1.setUnstitchInfo(data1, data, true);
                }
                else {
                    imMatch.logInfo("[imMatch.webSocketServer.tryToStitch] DeviceID1 = " + data1.deviceID + 
                        " DeviceID2 = " + data.deviceID + " are be stitched");

                    // Reverse stitch orientation of the later device
                    data.orientation.x = -data.orientation.x;
                    data.orientation.y = -data.orientation.y;

                    data1.matchDevices = group2.getDevices();
                    data.matchDevices = group1.getDevices();

                    data1.matchDeviceID = data.deviceID;
                    data.matchDeviceID = data1.deviceID;

                    group1.setStitchInfo(data1);
                    group2.setStitchInfo(data);
                }
            }

            return server;
        },

        exchangeData: function(data) {
            var group;
            if (data) {
                group = server.groups[server.device2group[data.deviceID]];
                group.broadcast({
                    action: "exchangeData",
                    viewport: data.viewport,
                    sprites: data.sprites,
                    touchPoints: data.touchPoints
                }, group.stitchInfo.matchDevices);

                imMatch.logInfo("[imMatch.Group.response.exchangeData] Receive \"exchangeData\" message" + 
                    " and broadcast \"exchangeData\" message." + " deviceID = " + data.deviceID);
            }
            
            return server;
        },

        exchangeDataDone: function(data) {
            var group, matchGroup, newGroup, removeGroup, 
                lengthGroup = 0, lengthMatchGroup = 0;
            if (data) {
                group = server.groups[server.device2group[data.deviceID]];
                matchGroup = server.groups[server.device2group[data.matchDeviceID]];
                lengthGroup = group.getLength();
                lengthMatchGroup = matchGroup.getLength();

                group.numDeviceDone = (imMatch.isEmpty(group.numDeviceDone))? 1 : group.numDeviceDone + 1;
                matchGroup.numDeviceDone = (imMatch.isEmpty(matchGroup.numDeviceDone))? 1 : matchGroup.numDeviceDone + 1;
                
                imMatch.logDebug("[imMatch.Group.response.exchangeDataDone] Receive \"exchangeDataDone\" message." + 
                    " #done in group1 = " + group.numDeviceDone + ", #done in group2 = " + matchGroup.numDeviceDone);
                // All devices in these two group are ready
                if (group.numDeviceDone === lengthGroup + lengthMatchGroup && 
                    matchGroup.numDeviceDone === lengthGroup + lengthMatchGroup) {
                    if (lengthGroup <= lengthMatchGroup) {
                        newGroup = group;
                        removeGroup = matchGroup;
                    }
                    else {
                        newGroup = matchGroup;
                        removeGroup = group;                        
                    }

                    // Add devices in removeGroup to newGroup and modify device2group
                    imMatch.each(removeGroup.getDevices(), function(deviceID, device) {
                        newGroup.addDevice(deviceID, device.webSocket, device.viewportQTY);
                        server.device2group[deviceID] = newGroup.getGroupID();
                    });

                    imMatch.remove(newGroup, newGroup.numDeviceDone);
                    newGroup.setStitchInfo();
                    imMatch.remove(server.groups, removeGroup.getGroupID());

                    newGroup.broadcast({
                        action: "exchangeDataDone"
                    });

                    imMatch.logInfo("[imMatch.Group.response.exchangeDataDone] Combine two groups." + 
                        " New group = " + newGroup.getGroupID() + ", removed group = " + removeGroup.getGroupID() + 
                        ", #devives = " + newGroup.getLength());
                }
            }

            return server;
        },

        tryToUnstitch: function(data) {
            var groupID;
            if (data) {
                groupID = server.device2group[data.deviceID];
                server.groups[groupID].setUnstitchInfo({deviceID: data.deviceID});
            }
            
            return server;
        },

        unstitchDone: function(data) {
            var device, group, newGroup;
            if (data) {
                group = server.groups[server.device2group[data.deviceID]];
                group.numDeviceDone = (imMatch.isEmpty(group.numDeviceDone))? 1 : group.numDeviceDone + 1;
                imMatch.logDebug("[imMatch.Group.response.unstitchDone] Receive \"unstitchDone\" message." + 
                    " #done in group = " + group.numDeviceDone);

                if (group.numDeviceDone === group.getLength()) {
                    imMatch.remove(group, numDeviceDone);

                    group.broadcast({
                        action: "unstitchDone",
                        triggerEvent: true
                    });

                    device = group.getDevices()[data.deviceID];
                    group.removeDeviceWithID(data.deviceID);
                    newGroup = server.addGroup(device.webSocket, data.devceID);

                    imMatch.logDebug("[imMatch.Group.response.unstitchDone] Slice two group." + 
                        " New group = " + newGroup.getGroupID() + ", #devices (new) = " + newGroup.getLength() +
                        ", original group = " + group.getGroupID() + ", #devives (original) = " + group.getLength());
                }
            }

            return server;
        }
    }
});

})(imMatch.webSocketServer);

// A new WebSocket connection is established
imMatch.webSocketServer.on("connection", function(webSocket) {
    var response = this.response;

    response.connection(webSocket);

    webSocket.on("message", function(message) {
        var packet = core_deSerialize(message);
        if (response[packet.action]) {
            response[packet.action](packet);
        }
        else {
            imMatch.logWarn("[imMatch.webSocketServer.on] Unknown packet action: " + packet.action);
        }
    });

    webSocket.on("close", function() {
        response.close(webSocket);
    });

    webSocket.on("error", function(error) {
        response.error(error, webSocket);
    });
});

// The underlying server emits an error
imMatch.webSocketServer.on("error", function(error) {
    imMatch.logError("[imMatch.webSocketServer] " + error.message);
    imMatch.error("[imMatch.webSocketServer] WebSocketServer error.");
});

imMatch.webSocketServer.monitorCandidates();
