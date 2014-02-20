// for getPixel() function
var unitCanvas = document.createElement("canvas");
unitCanvas.width = 1;
unitCanvas.height = 1;

this.imMatch.ImageTools = {

    // Retrieve pixels from a specified image
    getPixels: function(image) {
        var canvas = document.createElement("canvas");
        canvas.width = image.width;
        canvas.height = image.height;

        var context = canvas.getContext("2d");
        context.drawImage(image, 0, 0);
        var data = context.getImageData(
            0, 0, canvas.width, canvas.height).data;

        var pixels = [];
        imMatch.each(data, function(index, value) {
            pixels[index] = value;
        });

        return (pixels);
    },

    // Retrieve the pixel at the specified position
    getPixel: function(image, x, y) {
        // Convert from inch to pixel
        x = Math.round(image.dpi * x);
        y = Math.round(image.dpi * y);

        if (x < 0 || x >= image.width ||
            y < 0 || y >= image.height) {
            return {
                red: 0,
                green: 0,
                blue: 0,
                alpha: 0
            };
        }

        // Draw the image onto the unit canvas
        var context = unitCanvas.getContext("2d");
        context.clearRect(0, 0, 1, 1);
        context.drawImage(image, -x, -y);
        var data = context.getImageData(0, 0, 1, 1).data;

        return {
            red: data[0],
            green: data[1],
            blue: data[2],
            alpha: data[3]
        };
    }
};
