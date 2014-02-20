// ======================================================================

var MyScene = $$.Scene.extend({
    init: function(canvas, parentNode) {
        this._super(canvas, parentNode);
        
        var that = this;
        this.imageManager.loadFromList("image-list", function() {
            that._onImageLoaded();
        });
    },
    
    _onImageLoaded: function() {
        this.sprites = {};

        var sprite = new $$.ImageSprite(this, this, [{
            imageId: "taipei101",
            x : 0,
            y : 0,
            rad : 0.0,
            scale : 0.4,
            alpha : 1.0
        }]);
        sprite.minScale = 0.2; 
        sprite.maxScale = 2.0;
        
        this.addSprite(sprite);
    }
});

$(document).ready(function() {
    $$.Config.debug = false;
    // Hide addressbar for iPhone
    window.scrollTo(0, 1);

    // Init canvas size
    var width = $(window).width();
    var height = $(window).height();
    $("#canvas").attr({width: width, height: height});
    $("#canvas").width(width).height(height);
    $("#canvas").show();

    // Start imMatch Engine
    var engine = new $$.Engine(
        document.getElementById('canvas'));
    var scene = new window.MyScene(engine);
    engine.scenes.push(scene);

    // Exception handling
    window.onerror = function(msg, url, line) {
        engine.error("At line " + line + ". " + msg);
    };
});

// ======================================================================
