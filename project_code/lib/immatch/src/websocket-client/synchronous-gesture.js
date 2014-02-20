this.imMatch.SynchronousGesture = imMatch.EventBased.extend({
    init: function(scene, parentNode) {
        this._super();
        this._scene = scene;
        this._parent = parentNode;

        this._medianSpeeds = {};
        this._speeds = {}; // Unit: pixels / s
        this._cursorGroups = {}; // {groupId1:{cursorId1:{[{x:0, y:0}, {x:1, y:2}, ...}, {...}], color: xxx, lastTime:ooo, type:"start"}, cursorId2:{}, ...}, groupId2:, ...}
        this._medianInterval = 7;
        this._thresholdDistanceInGroup = 2;
        this._thresholdOrientation = 20;    // Unit: degree
        this._thresholdRatioSpeed = 0.8;
        this._thresholdLongCur = 1;
        
        // For tow-finger-circle gesture
        this._thresholdDisStart2End = 0.4;
        this._thresholdNumPoints = 7;
        this._thresholdDiffRadius = 0.4;
        this._thresholdDiffRad = 0.4;
        
        this._initHandlers();
    },
    
    // Initialize default event handlers
    _initHandlers: function() {
        var that = this;
        this._propagator = function(event) {
            that._scene.trigger(event);
        };
    },
    
    // Recognize syochronous gestires
    recognize: function(id, x, y, type) {
        var cursorGroup = null;
        var groupId = this._searchGroupIdByCursorId(id);
        if (groupId != null)
            cursorGroup = this._cursorGroups[groupId];
        
        this._processTouches(cursorGroup, id, x, y, type);
        // this._drawCursors();
        this._computeMedianSpeed(cursorGroup, id);
        this._tryToStitch(cursorGroup);
        
        if (cursorGroup != null) {
            if (imMatch.sizeof(cursorGroup) == 0)
                delete this._cursorGroups[groupId];
            else {
                if (cursorGroup[id] != null)
                    cursorGroup[id].lastTime = new Date().getTime();
            }
        }
    },
    
    // Process touches
    _processTouches: function(cursorGroup, id, x, y, type) {
        switch(type) {
        case "start":
            this._addCursorGroups(id, x, y, type);
            this._speeds[id] = [{x: 0, y: 0}];
            break;
        case "move": case "end": case "cancel":
            if (cursorGroup == null)
                return;
              
            if (!this._isInCursorGroup(cursorGroup, id, x, y)) {
                this._removeCursorById(id);
                return;
            }
            
            var interval = Math.max(new Date().getTime() - cursorGroup[id].lastTime, 0.0000001);
            var lastCursorPoint = cursorGroup[id][cursorGroup[id].length - 1];
            this._speeds[id].push({
                x: 1000 * (x - lastCursorPoint.x) / interval,
                y: 1000 * (y - lastCursorPoint.y) / interval});
                
            cursorGroup[id].push({x: x, y: y});
            cursorGroup[id].type = type;
            break;
        default:
            break;
        }
    },
    
    // Compute median speed during the medianInterval
    _computeMedianSpeed: function(cursorGroup, id) {
        if (cursorGroup == null || cursorGroup[id] == null)
            return;
            
        var interval = new Date().getTime() - cursorGroup[id].lastTime;
        if (interval >= this._medianInterval) {
            this._speeds[id].sort(function(a, b) {
                return imMatch.Math.norm(a) - imMatch.Math.norm(b);
            });
            
            var median = Math.floor(this._speeds[id].length / 2);
            var normMedianSpeed = Math.sqrt((this._speeds[id][median].x * this._speeds[id][median].x) + 
            (this._speeds[id][median].y * this._speeds[id][median].y));      
            if (!isNaN(normMedianSpeed) && normMedianSpeed != 0) {
                var normalizeMedianSpeed = {
                    x: this._speeds[id][median].x / normMedianSpeed,
                    y: this._speeds[id][median].y / normMedianSpeed
                };
                if (this._medianSpeeds[id] == null)
                    this._medianSpeeds[id] = [normalizeMedianSpeed];
                else
                    this._medianSpeeds[id].push(normalizeMedianSpeed);
                    
                this._speeds[id] = [];
            }
        }
    },
    
    //  Try to stitch devices
    _tryToStitch: function(cursorGroup) {
        if (cursorGroup == null)
            return;
        
        if (!this._isAllCursorsEndInGroup(cursorGroup))
            return;
            
        if(this._tryToStitchWithSwipeGesture(cursorGroup) ||
            this._tryToStitchWithPinchGesture(cursorGroup) ||
            this._tryToStitchWithSlideGesture(cursorGroup) ||
            this._tryToStitchWithCircleGesture(cursorGroup))
        {
            console.log("sync!!");
            this._scene.trigger("recogsyncgesture", {broadcast: true});
        }
        
        for (var cursorId in cursorGroup) {
            if (!cursorGroup.hasOwnProperty(cursorId))
                continue;
                
            this._removeCursorById(cursorId);
        }
    },
    
    // Try to stitch devices with a tow-finger-swipe gesture
    _tryToStitchWithSwipeGesture: function(cursorGroup) {
        var numCursors = imMatch.sizeof(cursorGroup);
        if (numCursors != 2) {
            this.trace("StitchingWithSwipe", "Swipe Gesture: Number of Cursors != 2");
            return false;
        }
        if (!this._isOrientationPreserving(cursorGroup)) {
            this.trace("StitchingWithSwipe", "Swipe Gesture: Orientation is Not Preserving");
            return false;
        }
        
        var stitchingPoint = {x: 0, y: 0};
        var stitchUnitSpeed = {x: 0, y: 0};
        for (var cursorId in cursorGroup) {
            if (!cursorGroup.hasOwnProperty(cursorId))
                continue;
            
            var lastTouchPoint = cursorGroup[cursorId][cursorGroup[cursorId].length - 1];
            var startTouchPoint = cursorGroup[cursorId][0];
            var isLastPointInJoinBoundary = this._isInJoinBoundary(lastTouchPoint);
            var isStartPointInJoinBoundary = this._isInJoinBoundary(startTouchPoint);
            if (isLastPointInJoinBoundary == "out" && isStartPointInJoinBoundary == "out") {
                this.trace("StitchingWithSwipe", "Swipe Gesture: Out of Boundary");
                return false;
            }
            else if (isLastPointInJoinBoundary == "out" && isStartPointInJoinBoundary != "out") {
                stitchingPoint.x += startTouchPoint.x;
                stitchingPoint.y += startTouchPoint.y;
            }
            else if (isLastPointInJoinBoundary != "out" && isStartPointInJoinBoundary == "out") {
                stitchingPoint.x += lastTouchPoint.x;
                stitchingPoint.y += lastTouchPoint.y;
            }
            else {
                this.trace("StitchingWithSwipe", "Swipe Gesture: All Touch Points Are in Boundary");
                return false;
            }
            
            stitchUnitSpeed.x += this._medianSpeeds[cursorId][this._medianSpeeds[cursorId].length-1].x;
            stitchUnitSpeed.y += this._medianSpeeds[cursorId][this._medianSpeeds[cursorId].length-1].y;
        }

        stitchingPoint.x /= numCursors;
        stitchingPoint.y /= numCursors;
        
        stitchUnitSpeed.x /= numCursors;
        stitchUnitSpeed.y /= numCursors;

        var margin = {x: 0, y: 0};

        var stitchingOrientation = {x: 0, y: 0};
        if (!this._isPerpendicular(stitchingPoint, margin,
             stitchingOrientation, stitchUnitSpeed)) {
            this.trace("StitchingWithSwipe", 
                "Swipe Gesture: Non-perpendicular Boundary");
            return false;
        }
        
        this.trace("StitchingWithSwipe", 
            "Swipe Gesture: Done!");        
        this._scene.communication.tryToStitch(stitchingPoint, 
            stitchingOrientation, margin, "Swipe");
        
        return true;
    },
    
    // Try to stitch devices with a pinch gesture
    _tryToStitchWithPinchGesture: function(cursorGroup) {
        if (imMatch.sizeof(cursorGroup) != 1) {
            this.trace("StitchingWithPinch", 
                "Pinch Gesture: Number of Cursors != 1");
            return false;
        }
        if (!this._isOrientationPreserving(cursorGroup)) {
            this.trace("StitchingWithPinch",
                "Pinch Gesture: Orientation is Not Preserving");
            return false;
        }
            
        var stitchingPoint = {x: 0, y: 0};
        var stitchUnitSpeed = {x: 0, y: 0};
        for (var cursorId in cursorGroup) {
            if (!cursorGroup.hasOwnProperty(cursorId))
                continue;
            
            var lastTouchPoint = cursorGroup[cursorId][cursorGroup[cursorId].length - 1];
            var startTouchPoint = cursorGroup[cursorId][0];
            var isLastPointInJoinBoundary = this._isInJoinBoundary(lastTouchPoint);
            var isStartPointInJoinBoundary = this._isInJoinBoundary(startTouchPoint);
            if (isLastPointInJoinBoundary != "out" && isStartPointInJoinBoundary == "out") {
                stitchingPoint.x = lastTouchPoint.x;
                stitchingPoint.y = lastTouchPoint.y;
            }
            else {
                this.trace("StitchingWithPinch", "Pinch Gesture: Out of Boundary");
                return false;
            }
            
            stitchUnitSpeed.x = this._medianSpeeds[cursorId][this._medianSpeeds[cursorId].length-1].x;
            stitchUnitSpeed.y = this._medianSpeeds[cursorId][this._medianSpeeds[cursorId].length-1].y;
        }
        
        var margin = {x: 0, y: 0};
        var stitchingOrientation = {x: 0, y: 0};
        if (!this._isPerpendicular(stitchingPoint, margin, stitchingOrientation, stitchUnitSpeed)) {
            this.trace("StitchingWithPinch", 
                "Pinch Gesture: Non-perpendicular Boundary");
            return false;
        }
        
        this.trace("StitchingWithPinch", "Pinch Gesture: Done!");      
        this._scene.communication.tryToStitch(stitchingPoint, stitchingOrientation, margin, "Pinch");
            
        return true;
    },
    
    // Try to stitch devices with a tow-finger-slide gesture
    _tryToStitchWithSlideGesture: function(cursorGroup) {
        if (imMatch.sizeof(cursorGroup) != 1) {
            this.trace("StitchingWithSlide", 
                "Slide Gesture: Number of Cursors != 1");
            return false;
        }
        if (!this._isOrientationPreserving(cursorGroup)) {
            this.trace("StitchingWithSlide", 
                "Slide Gesture: Orientation is Not Preserving");
            return false;
        }
        if (!this._isLongCursor(cursorGroup)) {
            this.trace("StitchingWithSlide", 
                "Slide Gesture: The Cursor is Not Long");
            return false;
        }
            
        var stitchingPoint = {x: 0, y: 0};
        var stitchUnitSpeed = {x: 0, y: 0};
        var scaleBoundary = 3;
        for (var cursorId in cursorGroup) {
            if (!cursorGroup.hasOwnProperty(cursorId))
                continue;
            
            numTouches = cursorGroup[cursorId].length;
            for (var i = 0; i < numTouches; ++i) {
                var touchPoint = cursorGroup[cursorId][i];
                if (this._isInJoinBoundary(touchPoint, scaleBoundary) == "out") {
                    this.trace("StitchingWithSlide", 
                        "Slide Gesture: Out of Boundary");
                    return false;
                }
                
                stitchingPoint.x += touchPoint.x;
                stitchingPoint.y += touchPoint.y;
            }
            
            stitchUnitSpeed.x = this._medianSpeeds[cursorId][this._medianSpeeds[cursorId].length-1].x;
            stitchUnitSpeed.y = this._medianSpeeds[cursorId][this._medianSpeeds[cursorId].length-1].y;
        }
        
        stitchingPoint.x /= numTouches;
        stitchingPoint.y /= numTouches;
        
        var margin = {x: 0, y: 0};
        var stitchingOrientation = {x: 0, y: 0};
        if (!this._isPerpendicular(stitchingPoint, margin, stitchingOrientation, 
            {x: stitchUnitSpeed.y, y: stitchUnitSpeed.x}, scaleBoundary)) {
            
            this.trace("StitchingWithSlide", 
                "Slide Gesture: Non-perpendicular Boundary");
            return false;
        }
        
        this.trace("StitchingWithSlide", "Slide Gesture: Done!");     
        this._scene.communication.tryToStitch(stitchingPoint, stitchingOrientation, margin, "Slide"); 
        
        return true;
    },
    
    // Try to stitch devices with a tow-finger-circle gesture
    _tryToStitchWithCircleGesture: function(cursorGroup) {
        var stitchingPoint = {x: 0, y: 0};
        if (imMatch.sizeof(cursorGroup) != 1) {
            this.trace("StitchingWithCircle", "Circle Gesture: Number of Cursors != 1");
            return false;
        }
        if (!this._isCircleCursor(cursorGroup, stitchingPoint)) {
            this.trace("StitchingWithCircle", "Circle Gesture: Orientation is Not Circle");
            return false;
        }
        
        var margin = {x: 0, y: 0};
        var stitchingOrientation = {x: 0, y: 0};
        switch(this._isInJoinBoundary(stitchingPoint, 3)) {
        case "left":
            stitchingPoint.x = 0;
            margin.x = this._scene.canvas.info.margin.left;
            stitchingOrientation.x = -1;
            break;
        case "right":
            stitchingPoint.x = this._scene.canvas.width;
            margin.x = -this._scene.canvas.info.margin.right;
            stitchingOrientation.x = 1;
            break;
        case "top":
            stitchingPoint.y = 0;
            margin.y = this._scene.canvas.info.margin.top;
            stitchingOrientation.y = -1;
            break;
        case "bottom":
            stitchingPoint.y = this._scene.canvas.height;
            margin.y = -this._scene.canvas.info.margin.bottom;
            stitchingOrientation.y = 1;
            break;
        default:
            this.trace("StitchingWithCircle", "Circle Gesture: Out of Boundary");
            return false;
            break;
        }
        
        this.trace("StitchingWithCircle", "Circle Gesture: Done!");
        this._scene.communication.tryToStitch(stitchingPoint, stitchingOrientation, margin, "Circle");

        return true;
    },
    
    // Check the cursor is orientation-preserving or not.
    _isOrientationPreserving: function(cursorGroup) {
        if (cursorGroup == null)
            return false;
            
        for (var cursorId in cursorGroup) {
            if (!cursorGroup.hasOwnProperty(cursorId))
                continue;
                
            if (this._medianSpeeds[cursorId] == null)
                return false;

            var thresholdNumOutliers = Math.round(this._medianSpeeds[cursorId].length / 3);
            var numOutliers = 0;
            for (var i = 2; i < this._medianSpeeds[cursorId].length; ++i) {
                var innerProduct = imMatch.Math.dot(this._medianSpeeds[cursorId][i-1], this._medianSpeeds[cursorId][i]);
                if (Math.abs(innerProduct) < Math.cos(this._thresholdOrientation * Math.PI / 180)) {
                    ++numOutliers;
                }
                if (numOutliers >= thresholdNumOutliers)
                    return false;
            }
        }

        return true;
    },
    
    // Check the cursor path is circle or not.
    _isCircleCursor: function(cursorGroup, center) {
        if (cursorGroup == null)
            return false;
        
        var mostTouchPoints = {
            top: this._scene.canvas.height,
            bottom: 0,
            left: this._scene.canvas.width,
            right: 0
        }
        for (var cursorId in cursorGroup) {
            if (!cursorGroup.hasOwnProperty(cursorId))
                continue;
                
            // 1. point must be near from the start point.
            var lastTouchPoint = cursorGroup[cursorId][cursorGroup[cursorId].length - 1];
            var startTouchPoint = cursorGroup[cursorId][0];
            var distance = imMatch.Math.distance(lastTouchPoint.x, lastTouchPoint.y, 
                    startTouchPoint.x, startTouchPoint.y);
            if (distance > this._thresholdDisStart2End) {
                        
                this.trace("StitchingWithCircle", "Circle Gesture: The End Point is Far From The Start Point");
                return false;
            }
        
            // 2. There must be  certain number of touch points.
            if (cursorGroup[cursorId].length < this._thresholdNumPoints) {
                this.trace("StitchingWithCircle", "Circle Gesture: The Number of Touch Points is Less");
                return false;
            }
            
            // 3. Determine the top-most, bottom-most, left-most, and right-most points, and
            //      use that to determine an approximate center and an approximate average radius.
            for (var i = 0; i < cursorGroup[cursorId].length; ++i) {
                var touchPoint = cursorGroup[cursorId][i];
                mostTouchPoints.top = (touchPoint.y < mostTouchPoints.top)? touchPoint.y : mostTouchPoints.top;
                mostTouchPoints.bottom = (touchPoint.y > mostTouchPoints.bottom)? touchPoint.y : mostTouchPoints.bottom;
                mostTouchPoints.left = (touchPoint.x < mostTouchPoints.left)? touchPoint.x : mostTouchPoints.left;
                mostTouchPoints.right = (touchPoint.x > mostTouchPoints.right)? touchPoint.x : mostTouchPoints.right;
            }
            
            center.x = (mostTouchPoints.left + mostTouchPoints.right) / 2;
            center.y = (mostTouchPoints.top + mostTouchPoints.bottom) / 2;
            
            var radius = ((mostTouchPoints.right - mostTouchPoints.left) / 2 +
                 (mostTouchPoints.bottom - mostTouchPoints.top) / 2) / 2
             
            var vec = {
                x: cursorGroup[cursorId][0].x - center.x,
                y: cursorGroup[cursorId][0].y - center.y,
            }
            var vecNorm = imMatch.Math.norm(vec);
            var oldRad = 0;
            var isExceedPI = false;
            for (var i = 0; i < cursorGroup[cursorId].length; ++i) {
                var touchPoint = cursorGroup[cursorId][i];
                // 4. Each point's distance from the center is within a certain variance of the approximate average radius.
                if (Math.abs(imMatch.Math.distance(touchPoint.x, touchPoint.y, 
                        center.x, center.y) - radius) > this._thresholdDiffRadius) {
                    this.trace("StitchingWithCircle", "Circle Gesture: The Cursor is Not Circle");
                    return false;
                }
             /*       
                // 5. That the angle formed from the center, to the start point, to the current poin flows in a nature order.
                //      The angle should continuously increase or decrease.
                var vec1 = {
                    x: touchPoint.x - center.x,
                    y: touchPoint.y - center.y
                };
                
                var cos = imMatch.Math.dot(vec, vec1) / (vecNorm * imMatch.Math.norm(vec1));
                var rad = Math.acos(cos);
                if (Math.abs(rad - Math.PI) < this._thresholdDiffRad && !isExceedPI)
                    isExceedPI = true;
                rad = (isExceedPI)? (2 *  Math.PI - rad) : rad;
                if (rad - oldRad < -this._thresholdDiffRad) {
                    this.trace("StitchingWithCircle", "Circle Gesture: Fail to Stitch Devices Because The Central Rad is not increasing");
                    return false;
                }
                oldRad = rad;*/
            }
        }

        return true;
    },
    
    
    _isInJoinBoundary: function(touchPoint, scale) {
        if (typeof(scale) == 'undefined')
            var scale = 1.2; // TODO: modify 1
            
        if (touchPoint.x >= 0 && touchPoint.x <= this._scene.canvas.info.joinBoundary * scale)
            return "left";
        else if (touchPoint.x >= this._scene.canvas.width - this._scene.canvas.info.joinBoundary * scale &&
             touchPoint.x <= this._scene.canvas.width)
            return "right";
        else if (touchPoint.y >= 0 && touchPoint.y <= this._scene.canvas.info.joinBoundary * scale)
            return "top";
        else if (touchPoint.y >= this._scene.canvas.height - this._scene.canvas.info.joinBoundary * scale &&
             touchPoint.y <= this._scene.canvas.height)
            return "bottom";
        else
            return "out";
    },
    
    _isPerpendicular: function(stitchingPoint, margin, stitchingOrientation, stitchUnitSpeed, scaleBoundary) {
        if (typeof("scaleBoundary") == "undefined")
            scaleBoundary = 1;
        switch(this._isInJoinBoundary(stitchingPoint, scaleBoundary)) {
        case "left":
            if (stitchUnitSpeed.y == 0 || Math.abs(stitchUnitSpeed.x / stitchUnitSpeed.y) > this._thresholdRatioSpeed) {
                stitchingPoint.x = 0;
                margin.x = this._scene.canvas.info.margin.left;
                stitchingOrientation.x = -1;
            }
            else
                return false;
            break;
        case "right":
            if (stitchUnitSpeed.y == 0 || Math.abs(stitchUnitSpeed.x / stitchUnitSpeed.y) > this._thresholdRatioSpeed) {
                stitchingPoint.x = this._scene.canvas.width;
                margin.x = -this._scene.canvas.info.margin.right;
                stitchingOrientation.x = 1;
            }
            else
                return false;
            break;
        case "top":
            if (stitchUnitSpeed.x == 0 || Math.abs(stitchUnitSpeed.y / stitchUnitSpeed.x) > this._thresholdRatioSpeed) {
                stitchingPoint.y = 0;
                margin.y = this._scene.canvas.info.margin.top;
                stitchingOrientation.y = -1;
            }
            else
                return false;
            break;
        case "bottom":
            if (stitchUnitSpeed.x == 0 || Math.abs(stitchUnitSpeed.y / stitchUnitSpeed.x) > this._thresholdRatioSpeed) {
                stitchingPoint.y = this._scene.canvas.height;
                margin.y = -this._scene.canvas.info.margin.bottom;
                stitchingOrientation.y = 1;
            }
            else
                return false;
            break;
        default:
            return false;
            break;
        }
        
        return true;
    },
    
    _isLongCursor: function(cursorGroup) {
        for (var cursorId in cursorGroup) {
            if (!cursorGroup.hasOwnProperty(cursorId))
                continue;
                
            var lastTouchPoint = cursorGroup[cursorId][cursorGroup[cursorId].length - 1];
            var startTouchPoint = cursorGroup[cursorId][0];
            if (imMatch.Math.distance(startTouchPoint.x, startTouchPoint.y, 
                lastTouchPoint.x, lastTouchPoint.y) < this._thresholdLongCur) {
                return false;
            }
        }
        
        return true;
    },
    
    // Add new cursor to cursorGroups
    _addCursorGroups: function(id, x, y, type) {
        var myGroupId = null;
        for (var groupId in this._cursorGroups) {
            if (!this._cursorGroups.hasOwnProperty(groupId))
                continue;

            if (this._isInCursorGroup(this._cursorGroups[groupId], id, x, y)) {
                myGroupId = groupId;
                break;
            }
        }
        
        if (myGroupId == null) {
            myGroupId = id;
            this._cursorGroups[myGroupId] = {};
        }
        
        this._cursorGroups[myGroupId][id] = [{x: x, y: y}];
        this._cursorGroups[myGroupId][id].color = Color.random().getHex();
        this._cursorGroups[myGroupId][id].lastTime = new Date().getTime();
        this._cursorGroups[myGroupId][id].type = type;
    },
    
    // The cursor (id) is whether in the cursorGroups or not.
    _isInCursorGroup: function(cursorGroup, id, x, y) {
        if (cursorGroup == null)
            return false;
            
        if (imMatch.sizeof(cursorGroup) == 1 && cursorGroup[id] != null)
            return true;
            
        for (var cursorId in cursorGroup) {
            if (!cursorGroup.hasOwnProperty(cursorId) || cursorId == id)
                continue;

            var point = cursorGroup[cursorId][cursorGroup[cursorId].length - 1];
            if (imMatch.Math.distance(x, y, point.x, point.y) <= this._thresholdDistanceInGroup)
                return true;
        }
        
        return false;
    },
    
    _searchGroupIdByCursorId: function(cursorId) {
        for (var groupId in this._cursorGroups) {
            if (!this._cursorGroups.hasOwnProperty(groupId))
                continue;
            
            if (this._cursorGroups[groupId][cursorId] != null)
                return groupId;
        }
        
        return null;
    },
    
    _isAllCursorsEndInGroup: function(cursorGroup) {
      if (cursorGroup == null)
            return false;
            
        var numCursorsEnd = 0;
        for (var cursorId in cursorGroup) {
            if (!cursorGroup.hasOwnProperty(cursorId))
                continue;
            
            if (cursorGroup[cursorId].type == "end" || cursorGroup[cursorId].type == "cancel")
                ++numCursorsEnd;
        }
        if (numCursorsEnd != imMatch.sizeof(cursorGroup))
            return false;
            
        return true;  
    },
    
    _removeCursorById: function(cursorId) {
        delete this._speeds[cursorId];
        delete this._medianSpeeds[cursorId];
        
        var groupId = this._searchGroupIdByCursorId(cursorId);
        if (groupId != null)
            delete this._cursorGroups[groupId][cursorId];
    },
    
    _drawCursors: function() {
        if (!imMatch.Config.debug ||
            typeof(this._scene.canvas) == "undefined") {
            return;
        }
        
        for (var groupId in this._cursorGroups) {
            if (!this._cursorGroups.hasOwnProperty(groupId))
                continue;

            for (var cursorId in this._cursorGroups[groupId]) {
                if (!this._cursorGroups[groupId].hasOwnProperty(cursorId))
                    continue;
    
                for (var i = 0; i < this._cursorGroups[groupId][cursorId].length; ++i) {
                    this._scene.canvas.drawCircle(
                        this._cursorGroups[groupId][cursorId][i].x, this._cursorGroups[groupId][cursorId][i].y, 
                        0, 1, 0.25, {
                        color: this._cursorGroups[groupId][cursorId].color,
                        alpha: 1
                    });
                }
            }
        }
    }
});
