this.imMatch.ImageManager = imMatch.EventBased.extend({
    init: function(scene, parentNode) {
        this._super();
        this._scene = scene;
        this._parent = parentNode;
        
        this._images = [];
        this._jobId = 0;
        this._numJobs = 0;
        this._numPending = 0;
        this._progress = 0;
        this._displayProgress = 0;
        this._onLoadListeners = [];
        
        this._initHandlers();
    },
    
    // Initialize default event handlers
    _initHandlers: function() {
        // Update
        this._bindDefault("update", this._update);
    },
    
    loadFromList: function(listFilePath, onLoadListener) {
        var currentJobId = this._jobId;
        this._onLoadListeners.push(onLoadListener);
        
        if (this._numPending > 0) {
            this._numJobs ++;
        }
        else {
            this._numJobs = 1;
            this._progress = 0;
            this._displayProgress = 0;
            this._scene.communication.setImageProgress(this._displayProgress);
        }
            
        this._numPending ++;
        
        // Read image list from specified URL
        var that = this;
        $.ajax({
            type: "GET",
            url: listFilePath + "?" + (new Date()).getTime(),
            async: true,
            dataType: "json",
            success: function(data) {
                data = that._parseList(data);
                that._loadList(currentJobId, listFilePath, data);
            },
            error: function() {
                that.error("Failed to load image list '" +
                    listFilePath + "'");
            }
        });
    },

    _parseList: function(data) {
        var result = [];
        imMatch.each(data, function(index, item) {
            if (typeof item.count == "undefined") {
                result.push({
                    id: item.id,
                    path: item.path,
                    dpi: item.dpi
                });
                return;
            }

            for (var i = 0; i < item.count; i ++) {
                result.push({
                    id: imMatch.fillNumber(item.id, i),
                    path: imMatch.fillNumber(item.path, i),
                    dpi: item.dpi
                });
            }
        });

        return result;
    },

    _loadList: function(currentJobId, listFilePath, data) {
        // Load images
        if (currentJobId != this._jobId)
            return;

        var numJobs = data.length;
        for (var i = 0; i < numJobs; ++i) {
            var image = new Image();       
            image.dpi = data[i].dpi;
            
            var that = this;
            image.onload = function(index) {
                return function() {
                        
                    if (currentJobId != that._jobId)
                        return;
                
                    that._images[data[index].id] = this;
                    that._progress += (1 - that._progress) / that._numPending;
                    that._numPending --;
                }
            }(i);
            
            // Make the path relative to list file
            var parentPath =
                listFilePath.replace(/[^\/]*$/, "");

            var imgPath = data[i].path;
            if (imgPath.match(/^https?:\/\//) == null &&
                imgPath.match(/^\//) == null) {
                imgPath = parentPath + imgPath;
            }
            else {

            }

            // Load the image
            var that = this;
            image.onerror = function(imgPath) {
                return function() {
                    that.error(
                        "Failed to load image '" + imgPath + "'");
                }
            }(imgPath);

            image.src = imgPath + "?" + (new Date()).getTime();
            this._numJobs ++;
            this._numPending ++;
        }
        
        this._progress += (1 - this._progress) / this._numPending;
        this._numPending --;
    },
    
    clear: function() {
        this._jobId ++;
        this._numPending = 0;
        this._images.splice(0, this._images.length);
    },
    
    getImage: function(id) {
        if (!this._images[id]) {
            this.error(
                "Image manager cannot find image id '" + id + "'.");
            return null;
        }
            
        return this._images[id];
    },
    
    isCompleted: function() {
        return (this._numPending == 0 && Math.min(this._displayProgress,
            this._scene.communication.getImageProgress()) >= 1);
    },
    
    _update: function(event) {
        var diff = this._progress - this._displayProgress;
        var movingThres = event.timeElapsed / (2000 * imMatch.Config.loadingSpeed);
        
        if (diff < movingThres)
            this._displayProgress = this._progress;
        else
            this._displayProgress += movingThres;
        this._scene.communication.setImageProgress(this._displayProgress);
        
        if (!this.isCompleted())
            return;

        for (var i = 0; i < this._onLoadListeners.length; ++i)
            this._onLoadListeners[i]();
            
        this._onLoadListeners = [];
    },
    
    drawProgress: function() {
        // Fill background
        this._scene.canvas.fillColor("#cccccc", 0.9);

        // Draw frame
        var width = this._scene.canvas.width * 0.6;
        var height = width * 0.05;
        var radius = height * 0.5;
        var x = this._scene.canvas.width * 0.5;
        var y = this._scene.canvas.height * 0.5;

        this._scene.canvas.drawRoundedRect(
            x, y, 0, 1, width, height, radius, {
                color: "rgba(255,255,255,0)",
                strokeWidth: radius * 0.4,
                strokeColor: "#555555"
            });
            
        // Draw progress bar
        var barMargin = height * 0.3;
        var barRadius = radius - barMargin;
        var barWidth = (width - 2 * barMargin - 2 * barRadius) *
            Math.min(this._displayProgress, 
            this._scene.communication.getImageProgress()) + 2 * barRadius;
        var barHeight = height - 2 * barMargin;
        var barX = x - width * 0.5  + barMargin + barWidth * 0.5;
            
        this._scene.canvas.drawRoundedRect(
            barX, y, 0, 1, barWidth, barHeight, barRadius, {
                color: "#555555",
                alpha: 1,
            });
    }
});
