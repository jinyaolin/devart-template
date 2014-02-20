this.imMatch.Math = {

    // Generate a random Id
    randomId: function() {
        return (Math.round(Math.random() * 10000000000));
    },
    
    // Rotate (x, y) with a specified point as rotation center
    rotate: function(x, y, centerX, centerY, rad) {
        return {
            x: centerX + (x - centerX) * Math.cos(rad) -
                (y - centerY) * Math.sin(rad),
            y: centerY + (x - centerX) * Math.sin(rad) +
                (y - centerY) * Math.cos(rad)
        };
    },
    
    // Calculate mean value of (x,y) pairs
    meanXY: function(arrayXY) {
        var center = { x: 0, y: 0 };
        for (var i = 0; i < arrayXY.length; i ++) {
            center.x += arrayXY[i].x;
            center.y += arrayXY[i].y;
        }
    
        center.x /= arrayXY.length;
        center.y /= arrayXY.length;
        return (center);
    },
    
    // Calculate the distance between two points
    distance: function(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2));
    },
    
    // Interpolate two values
    interpolate: function(a, b, weight) {
        return (a * weight + b * (1 - weight));
    },
    
    dot: function(vec1, vec2) {
        return (vec1.x * vec2.x + vec1.y * vec2.y);
    },
    
    cross: function(vec1, vec2) {
        if (!vec1.hasOwnProperty("z"))
            vec1.z = 1;
        if (!vec2.hasOwnProperty("z"))
            vec2.z = 1;
        return {
            x: vec1.y * vec2.z - vec1.z * vec2.y,
            y: vec1.z * vec2.x - vec1.x * vec2.z,
            z: vec1.x * vec2.y - vec1.y * vec2.z
        };
    },
    
    norm: function(vec) {
        if (vec.hasOwnProperty("z"))
            return Math.sqrt(vec.x * vec.x + vec.y * vec.y + vec.z * vec.z);
        else
            return Math.sqrt(vec.x * vec.x + vec.y * vec.y);
    }
};
