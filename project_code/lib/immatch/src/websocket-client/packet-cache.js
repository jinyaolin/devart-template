this.imMatch.PacketCache = Class.extend({
    init: function(parentNode) {
        this._parent = parentNode;
        this._synchronizePackets = [];
        this._touchSyncPackets = [];
        this._sendTouchSyncPackets = [];
        this._stitchDataPacket = null;
        this._disconnectDataPacket = null;
        this._exchangeDataPackets = [];
    },
    
    getPacketsWithChunk: function(type, chunk) {
        var packets = null;
        switch(type) {
        case "synchronize":
            packets = this._getsynchronizePacketsWithChunk(chunk);
            break;
        case "touchSync":
            packets = this._touchSyncPackets;
            break;
        case "sendTouchSync":
            packets = this._sendTouchSyncPackets;
            break;
        case "stitchData":
            packets = this._stitchDataPacket;
            break;
        case "exchangeData":
            packets = this._exchangeDataPackets;
            break;
        case "disconnectData":
            packets = this._disconnectDataPacket;
            break;
        default:
            this.warning("Warning: PacketCache DO NOT contain packet type: " + type);
            break;
        }
        
        return packets;
    },
    
    addPacketWithType: function(packet, type) {
        switch(type) {
        case "synchronize":
            this._synchronizePackets.push(packet);
            break;
        case "touchSync":
            this._touchSyncPackets = this._touchSyncPackets.concat(packet);
            break;
        case "sendTouchSync":
            this._sendTouchSyncPackets.push(packet);
            break;
        case "stitchData":
            if (this._stitchDataPacket == null)
                this._stitchDataPacket = packet;
            break;
        case "exchangeData":
            this._exchangeDataPackets.push(packet);
            break;
        case "disconnectData":
            if (this._disconnectDataPacket == null)
                this._disconnectDataPacket = packet;
            break;
        default:
            this.warning("Warning: PacketCache DO NOT contain packet type: " + type);
            break;
        }
    },
    
    removePacketsBeforeChunk: function(type, chunk) {
        switch(type) {
        case "synchronize":
            this._removesynchronizePacketsBeforeChunk(chunk);
            break;
        case "touchSync":
            this.warning("Warning: " + type + " cannot be removed before chunk: " + chunk + ".");
            break;
        case "sendTouchSync":
            this._sendTouchSyncPackets = [];
            break;
        case "stitchData":
            this._stitchDataPacket = null;
            break;
        case "exchangeData":
            this._exchangeDataPackets = [];
            break;
        case "disconnectData":
            this._disconnectDataPacket = null;
            break;
        default:
            this.warning("Warning: PacketCache DO NOT contain packet type: " + type);
            break;
        }
    },
    
    pullPacketsAtFrame: function(type, atFrame) {
       var packets = null;
       switch(type) {
        case "synchronize":
            this.warning("Warning: " + type + " cannot be pulled at frame: " + atFrame + 
            ". Please use 'getPacketsWithChunk' function");
            break;
        case "touchSync":
            packets = this._pullTouchPacketsAtFrame(atFrame);
            break;
        case "sendTouchSync":
            packets = this._sendTouchSyncPackets;
            this._sendTouchSyncPackets = [];
            break;
        case "stitchData":
            packets = this._stitchDataPacket;
            this._stitchDataPacket = null;
            break;
        case "exchangeData":
            packets = this._exchangeDataPackets;
            this._exchangeDataPackets = [];
            break;
        case "disconnectData":
            packets = this._disconnectDataPacket;
            this._disconnectDataPacket = null;
            break;
        default:
            this.warning("Warning: PacketCache DO NOT contain packet type: " + type);
            break;
        } 
        
        return packets;
    },
    
    updateTouchSync: function(frameOffset) {
        for (var i = 0; i < this._touchSyncPackets.length; ++i)
            this._touchSyncPackets[i].atFrame -= frameOffset;
        
        for (var i = 0; i < this._sendTouchSyncPackets.length; ++i)
            this._sendTouchSyncPackets[i].atFrame -= frameOffset;
    },
    
    _getsynchronizePacketsWithChunk: function(chunk) {
        if (typeof(chunk) == "undefined")
            return null;
            
        var packets = [];
        for (var i = 0; i < this._synchronizePackets.length; ++i) {
            if (this._synchronizePackets[i].executeChunk == chunk)
                packets.push(this._synchronizePackets[i]);
        }
        
        return packets;
    },
    
    _removesynchronizePacketsBeforeChunk: function(chunk) {
        if (typeof(chunk) == "undefined")
            return;
        
        for (var i = 0; i < this._synchronizePackets.length;) {
            if (this._synchronizePackets[i].executeChunk < chunk)
                this._synchronizePackets.splice(i, 1);
            else
                ++i;
        }
    },
    
    _pullTouchPacketsAtFrame: function(atFrame) {
        if (typeof(atFrame) == "undefined")
            return null;

        var touches = [];
        for (var i = 0; i < this._touchSyncPackets.length;) {
            if (this._touchSyncPackets[i].atFrame == atFrame) {
                touches.push(this._touchSyncPackets[i]);
                this._touchSyncPackets.splice(i, 1);
            }
            else
                ++i;
        }

        return touches;
    }
});
