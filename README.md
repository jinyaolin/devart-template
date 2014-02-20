# Dance! Draw Men

We want to create a large interactive multitouch display by assemble many portable pads or mobiles. First, each kids would be asked to draw a man on a pad. And we would put them together and perform a stitch gesture to combine them into one big interactive screen. The draw men would start to dance with the music. With these portable pads we can bring the power of technology and art to the far far away place.

## Tutorial of imMatch SDK

imMatch SDK is used in the project. The following tutorial is simple. Please visit [imMatch SDK Wiki](https://bitbucket.org/kf99916/immatch/) to get more details.

### 1. Install [Grunt](http://gruntjs.com/)

```
#!sh
npm install -g grunt-cli
```

Install [Node.js](http://nodejs.org/) if ```npm``` is not available.

### 2. Modify IP address of your websocket server

Replace "webSocketURL" with IP address of your websocket server at ```package.json```

### 3. Modify web document root

Replace "webServerDocuments" with the path of your web document root at ```package.json```

### 4. Build imMatch

```
#!sh
cd immatch && npm run build
```

The built version of imMatch will be put in the ```dist/```.

If you want to copy the build to the web server document root which you set, please execute the following command:

```
#!sh
cd immatch && npm run start
```