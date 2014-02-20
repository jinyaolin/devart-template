this.imMatch.Viewport = imMatch.EventBased.extend({
    init: function(scene, parentNode) {
        this._super();
    	this._scene = scene;
    	this._parent = parentNode;

    	this.deviceId = "d" + imMatch.Math.randomId();
    	this.x = 0;
    	this.y = 0;
    	this.width = 0;
    	this.height = 0;
    	this.rad = 0;
    },
    
    local2Global: function(x, y) {
        return (imMatch.Math.rotate(
            x + this.x - this.width / 2,
            y + this.y - this.height / 2,
            this.x, this.y, this.rad));
    },

    global2Local: function(x, y) {
        return (imMatch.Math.rotate(
            x - this.x + this.width / 2,
            y - this.y + this.height / 2,
            this.width / 2,
            this.height / 2,
            -this.rad));
    },
    
    onConnect: function() {
    	
    },
    
    onDisconnect: function() {
    	
    },
    
    serialize: function() {
        return {
            deviceId: this.deviceId,
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height,
            rad: this.rad
        }
    },
    
    deserialize: function(data) {
        this.deviceId = data.deviceId;
        this.x = data.x;
        this.y = data.y;
        this.width = data.width;
        this.height = data.height;
        this.rad = data.rad;
    },
    
    update: function(x, y, rad) {
        var translate = {
            x: x - this.x,
            y: y - this.y
        };
        var rotateRad = rad - this.rad;
        
        var viewport = this._scene.viewport;
        function fixPosFunc(x, y, rad) {
            var pos = imMatch.Math.rotate(x, y, viewport.x, viewport.y, rotateRad);
            x = pos.x;
            y = pos.y;
            
            x += translate.x;
            y += translate.y;
            rad += rotateRad;
            
            return {x: x, y: y, rad: rad};
        };
        
        var packetCache = this._scene.communication.getPacketCache();
        var touchSyncPackets = packetCache.getPacketsWithChunk("touchSync");
        for (var i = 0; i < touchSyncPackets.length; ++i) {
            var newTouchSync = fixPosFunc(touchSyncPackets[i].x, touchSyncPackets[i].y, 0);
            touchSyncPackets[i].x = newTouchSync.x;
            touchSyncPackets[i].y = newTouchSync.y;
        }

        this._scene.trigger("moveworld", {
            broadcast: true,
            fixFunction: fixPosFunc
        });

        this.x = x;
        this.y = y;
        this.rad = rad;
    }
});
