module.exports = grunt => {
  require("load-grunt-tasks")(grunt);

  grunt.initConfig({
    browserify: {
      dist: {
        options: {
          transform: [["babelify", {presets: ["env", "react"]}]],
          // debug true means include source maps in bundle.js
          browserifyOptions: { debug: true }
        },
        files: {
          "public/bundle.js": "src/index.js"
        }
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
    watch: {
      files: ['src/*.js'],
      tasks: ['babel', 'browserify']
    }
  });

  grunt.registerTask("prod", ["browserify", "babel"]);
  grunt.registerTask("default", ["watch"]);
}
