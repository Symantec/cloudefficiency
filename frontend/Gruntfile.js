module.exports = grunt => {
  require("load-grunt-tasks")(grunt);

  grunt.initConfig({
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
        files: {
          "public/bundle.js": "src/index.js"
        },
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
      files: ['src/*.js'],
      tasks: ['newer:babel:dist']
    }
  });

  grunt.registerTask("prod", ["browserify:dist", "babel"]);
  grunt.registerTask("default", ["concurrent:watchTarget"]);
}
