# Dance! Draw Men

We want to create a large interactive multitouch display by assemble many portable pads or mobiles. First, each kids would be asked to draw a man on a pad. And we would put them together and perform a stitch gesture to combine them into one big interactive screen. The draw men would start to dance with the music. With these portable pads we can bring the power of technology and art to the far far away place.

## Tutorial

### 1. Set up a web server

If your machine cannot be a web server. Please visit [imMatch SDK Wiki](https://bitbucket.org/kf99916/immatch/) to get more details.

### 2. Build imMatch SDK

Please see [Tutorial of building imMatch SDK](https://github.com/jinyaolin/devart-template#tutorial-of-building-immatch-sdk) to get more details.

### 3. Copy source codes to your web document root

```
cp project_code/websocket-client/** WEB_DOCUMENT_ROOT/devart/
```

### 4. Run imMatch websocket server

```
node project_code/websocket-server/immatch-ws-server.min.js
```

### 5. Enjoy it! :)

## Tutorial of building imMatch SDK

imMatch SDK is used in the project. The following tutorial is simple. Please visit [imMatch SDK Wiki](https://bitbucket.org/kf99916/immatch/) to get more details.


### 1. Go to project directory

```
cd devart-template
```

### 2. Install [Node.js](http://nodejs.org/)

### 3. Install [Grunt](http://gruntjs.com/)

```
npm install -g grunt-cli
```

### 4. Modify IP address of your websocket server

Replace "webSocketURL" with IP address of your websocket server at ```package.json```. The default value is ```127.0.0.1```.

### 5. Modify web document root

Replace "webServerDocuments" with the path of your web document root at ```package.json```. The default value is ```/Library/WebServer/Documents```. The build command - ```sudo npm run start``` - will can copy outputs to the root.

### 6. Build imMatch

```
npm run build
```

- imMatch client library will be put in the ```project_code/websocket-client/js/```.
- imMatch server build will be put in the  ```project_code/websocket-server/```.

If you want to copy the build to the web server document root which you set, please execute the following command:

```
sudo npm run start
```