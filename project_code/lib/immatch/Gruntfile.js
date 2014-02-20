module.exports = function(grunt) {
	"use strict";

	function readOptionalJSON( filepath ) {
		var data = {};
		try {
			data = grunt.file.readJSON( filepath );
		} catch ( e ) {}
		return data;
	}

	var srcHintOptions = readOptionalJSON("src/jshintrc");

	// The concatenated file won't pass onevar
	// But our modules can
	delete srcHintOptions.onevar;

	// Project configuration
	grunt.initConfig({
		pkg: grunt.file.readJSON("package.json"),
		meta: {
			imMatch: {
				minBanner: "/*! <%= pkg.title %> v<%= pkg.version %> Client Javascript Library <%= pkg.homepage %> | <%= pkg.licenses[0].type %> license */",
				banner: "/*! <%= pkg.title %> v<%= pkg.version %> Client Javascript Library\n" + 
						" * <%= pkg.homepage %>\n" + 
						" *\n" +
						" * Copyright 2012, <%= grunt.template.today('yyyy') %> <%= pkg.author.name %>\n" +
						" * Released under the <%= pkg.licenses[0].type %> license\n" +
						" * <%= pkg.licenses[0].url %>\n" +
						" *\n" +
						" * Date: <%= grunt.template.today('yyyy-mm-dd') %>\n" + 
						" */"
			},
			imMatchWsServer:
			{
				minBanner: "/*! <%= pkg.title %> v<%= pkg.version %> Websocket Server <%= pkg.homepage %> | <%= pkg.licenses[0].type %> license */",
				banner: "/*! <%= pkg.title %> v<%= pkg.version %> Websocket Server\n" + 
						" * <%= pkg.homepage %>\n" + 
						" *\n" +
						" * Copyright 2012 <%= pkg.author.name %>\n" +
						" * Released under the <%= pkg.licenses[0].type %> license\n" +
						" * <%= pkg.licenses[0].url %>\n" +
						" *\n" +
						" * Date: <%= grunt.template.today('yyyy-mm-dd') %>\n" + 
						" */"
			}
		},
		concat: {
			options: {
		      stripBanners: true
		    },
			imMatch: {
				options: {
					banner: "<%= meta.imMatch.banner %>"
				},
				src:["src/common/intro.js", 
					"src/common/toolbox.js", 
					"src/common/math-old.js", 
					"src/common/class.js",
					"src/websocket-client/3rd-party/color.js",
					"src/websocket-client/3rd-party/mdetect.js",
					"src/websocket-client/*.js",
					"src/common/exports.js",
					"src/common/outro.js"],
				dest:"dist/immatch.js"
			},
			imMatchWsServer: {
				options: {
					banner: "<%= meta.imMatchWsServer.banner %>"
				},
				src: ["src/common/intro-strict.js", 
						"src/common/core.js",
						"src/common/log.js",
						"src/common/math.js",
						"src/websocket-server/group.js",
						"src/websocket-server/websocket-server.js",
						"src/common/outro.js"],
				dest: "dist/immatch-ws-server.js"
			}
		},
		jsonlint: {
			pkg: {
				src: [ "package.json" ]
			}
		},
		jshint: {
			all: {
				src: [
					"src/**/*.js", "Gruntfile.js"
				],
				options: {
					jshintrc: true
				}
			},
			dist: {
				src: [
					"dist/immatch.js", 
					"dist/immatch-ws-server.js"
				],
				options: srcHintOptions
			}
		},
		"regex-replace": {
			imMatch: {
				src: ["dist/immatch.js"],
				actions: [
					{
						name: "WebSocket URL",
						search: "@WEBSOCKET_URL",
						replace: "<%= pkg.configurations.webSocketURL %>"
					}
				]
			}
		},
		uglify: {
			my_target: {
				files: {
					"../../websocket-client/js/immatch.min.js": ["dist/immatch.js"]
				},
				options: {
					preserveComments: false,
					sourceMap: "dist/immatch.min.map",
					sourceMappingURL: "immatch.min.map",
					report: "min",
					beautify: {
						ascii_only: true
					},
					banner: "<%= meta.imMatch.minBanner %>",
					compress: {
						hoist_funs: false,
						loops: false,
						unused: false
					}
				}
			},
			my_advanced_target: {
				files: {
					"../../websocket-server/immatch-ws-server.min.js": ["dist/immatch-ws-server.js"]
				},
				options: {
					preserveComments: false,
					sourceMap: "dist/immatch-ws-server.min.map",
					sourceMappingURL: "immatch-ws-server.min.map",
					report: "min",
					beautify: {
						ascii_only: true
					},
					banner: "<%= meta.imMatchWsServer.minBanner %>",
					compress: {
						hoist_funs: false,
						loops: false,
						unused: false
					}
				}
			}
		},
		copy: {
			main: {
				files: [
					{expand: true, cwd:"../../websocket-client/js/", src: ["immatch.min.js"], dest: "<%= pkg.webServerDocuments %>/devart/js/"},
				]
			}
		}
	});

	// Load grunt tasks from NPM packages
	require( "load-grunt-tasks" )( grunt );

	// Watch task
	grunt.registerTask( "watch", ["jsonlint", "concat", "regex-replace", "uglify", "copy"]);

	// Default grunt.
	grunt.registerTask("default", ["jsonlint", "concat", "regex-replace", "uglify"]);
};
