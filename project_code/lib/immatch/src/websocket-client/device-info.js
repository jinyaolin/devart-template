this.imMatch.DeviceInfo = imMatch.EventBased.extend({
    init: function(parentNode) {
        this._super();
        this._parent = parentNode;
        this._detect();
    },
    
    _detect: function() {
       if (DetectIphoneOrIpod())
            this._iPhone();
       else if (DetectIpad())
            this._iPad();
       else if (DetectAndroidTablet())
            this._asusSlider();
       else if (DetectAndroidPhone())
            this._samsungGalaxyNote();
       else if (DetectBlackBerryTablet)
            this._blackBerryPlayBook();
       else
            this._default();
    },

    _default: function() {
        this.warning("Cannot identify this machine.");
        
        this.dpi = 72.0;
        this.joinBoundary = 0.35;
        this.margin = {
            top : 0.0,
            bottom : 0.0,
            left : 0.0,
            right : 0.0
        };
    },

    _iPhone: function() {
        this.dpi = 326.0 / 2;
        this.joinBoundary = 0.3;
        this.margin = {
            top : (4.5 - 960.0 / 326.0) / 2,
            bottom : (4.5 - 960.0 / 326.0) / 2,
            left : (2.31 - 640.0 / 326.0) / 2,
            right : (2.31 - 640.0 / 326.0) / 2
        };
    },

    _iPad: function() {
        this.dpi = 132.0;
        this.joinBoundary = 0.35;
        this.margin = {
            top : (9.5 - 1024.0 / 132.0) / 2,
            bottom : (9.5 - 1024.0 / 132.0) / 2,
            left : (7.31 - 768.0 / 132.0) / 2,
            right : (7.31 - 768.0 / 132.0) / 2
        };
    },

    _motorolaXoom: function() {
        this.dpi = 160.0;
        this.joinBoundary = 0.35;      
        this.margin = {
            top : (9.81 - 1280.0 / this.dpi) / 2,
            bottom : (9.81 - 1280.0 / this.dpi) / 2,
            left : (6.61 - 800.0 / this.dpi) / 2,
            right : (6.61 - 800.0 / this.dpi) / 2
        };
    },
    
    _asusSlider: function() {
        this.dpi = 72.0;
        this.joinBoundary = 0.35;      
        this.margin = {
            top : 1.02,
            bottom : 1.02,
            left : 0.79,
            right : 0.79
        };
    },
    
    _samsungGalaxyNote: function() {
        this.dpi = 150.0;
        this.joinBoundary = 0.35;      
        this.margin = {
            top : 0.63,
            bottom : 0.55,
            left : 0.16,
            right : 0.16
        };
    },
    
    _blackBerryPlayBook: function() {
        this.dpi = 144.0;
        this.joinBoundary = 0.7;      
        this.margin = {
            top : 0.75,
            bottom : 0.75,
            left : 0.75,
            right : 0.75
        };
    }
});
