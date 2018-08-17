let timePeriod = (new Date()).toLocaleDateString().replace(/\//g, "_");

todayPublicBundleFiles = {};
todayPublicBundleFiles['./output/' + timePeriod + "/public/bundle.js"] = "src/index.js";

todayPublicCSSFiles = {};
todayPublicCSSFiles['./output/' + timePeriod + "/public/index.css"] = "css/index.sass";

module.exports = grunt => {
  require("load-grunt-tasks")(grunt);

  grunt.initConfig({
    sass: {
      dev: {
        files: {
          "public/index.css": "css/index.sass"
        },
      },
      dist: {
        files: todayPublicCSSFiles
      },
      options: {
        implementation: require('node-sass'),
        sourceMap: true,
        sourceMapEmbed: true
      }
    },
    browserify: {
      options: {
          transform: [["babelify", {presets: ["env", "react"]}]],
          browserifyOptions : {
            debug : true // source mapping
          }
      },
      dev: {
        files: {
          "public/bundle.js": "src/index.js"
        },
        options : {
          watch : true, // use watchify for incremental builds!
          keepAlive : true, // watchify will exit unless task is kept alive
          transform: [["babelify", {presets: ["env", "react"]}]],
          browserifyOptions : {
            debug : true // source mapping
          }
        }
      },
      dist: {
        files: todayPublicBundleFiles
      }
    },
    babel: {
      options: {
        sourceMap: true
      },
      dist: {
        files: [{
          expand: true,
          cwd: './src',
          src: ['*.js'],
          dest: './dist',
          ext: '.js'
        }]
      }
    },
    concurrent: {
      watchTarget: ['browserify:dev', 'watch'],
      options: {
        logConcurrentOutput: true
      }
    },
    watch: {
      sass: {
        files: ['css/*'],
        tasks: ['newer:sass:dev']
      },
      babel: {
        files: ['src/*.js'],
        tasks: ['newer:babel:dist']
      }
    }
  });

  grunt.registerTask("prod", ["browserify:dist", "babel:dist", "sass:dist"]);
  grunt.registerTask("default", ["concurrent:watchTarget"]);
}
