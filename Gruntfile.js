module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
		files: [
            'Gruntfile.js', 
            'src/**/*.js',
        ]
    },
    browserify: {
      dist: {
        files: {
          'build/<%= pkg.name %>.js': ['src/SensorTag.js'],
        }
      }
    },
    uglify: {
        my_target: {
            files: {
                'build/<%= pkg.name %>.min.js': 'build/<%= pkg.name %>.js'
            }
        }
    },
    watch: {
		files: ['<%= jshint.files %>'],
		tasks: ['jshint', 'browserify']
    },
	jsdoc : {
        dist : {
            src: ['<%= jshint.files %>'], 
            options: {
                destination: 'doc'
            }
        }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-jsdoc');
  grunt.loadNpmTasks('grunt-browserify');
  
  grunt.registerTask('default', ['jshint', 'browserify', 'uglify']);

};
