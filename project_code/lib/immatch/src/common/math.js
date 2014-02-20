imMatch.math = {
    // Rotate (x, y) with a specified point as rotation center
    rotate: function(point, rad, /* Optional */ center) {
        if (!imMatch.isNumeric(rad) || rad === 0 || imMatch.isEmpty(point.x) || imMatch.isEmpty(point.y)) {
            return point;
        }

        if (!center) {
            center = {x:0, y:0};
        }

        var vec, cos, sin;

        vec = {x: point.x - center.x, y: point.y - center.y};
        cos = Math.cos(rad);
        sin = Math.sin(rad);

        return {
            x: center.x + vec.x * cos - vec.y * sin,
            y: center.y + vec.x * sin + vec.y * cos
        };
    },

    // Return the largest argument or element in array and index
    max: function() {
        var target = arguments[0], 
            result = {index:-1, value: +Infinity};

        if (!imMatch.isArrayLike(target)) {
            target = [];
            imMatch.each(arguments, function(i, argument) {
                core_push.call(target, argument);
            });
        }

        result.value = Math.max.apply(Math, target);
        result.index = core_indexOf.call(target, result.value);

        return result;
    },

    // Return the smallest argument or element in array and index
    min: function() {
        var target = arguments[0], 
            result = {index:-1, value: -Infinity};

        if (!imMatch.isArrayLike(target)) {
            target = [];
            imMatch.each(arguments, function(i, argument) {
                core_push.call(target, argument);
            });
        }

        result.value = Math.min.apply(Math, target);
        result.index = core_indexOf.call(target, result.value);

        return result;
    },

    dot: function(vector1, vector2) {
        if (!imMatch.is2DVector(vector1) || !imMatch.is2DVector(vector2)) {
            return 1;
        }

        return (vector1.x * vector2.x + vector1.y * vector2.y);
    },

    rad: function(vector1, vector2) {
        if (!imMatch.is2DVector(vector1) || !imMatch.is2DVector(vector2)) {
            return 0;
        }

        return (Math.atan2(vector2.y, vector2.x) - Math.atan2(vector1.y, vector1.x));
    }
};
/*
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
*/