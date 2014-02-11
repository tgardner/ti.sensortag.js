module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
        options: {
            separator: '\n',
            banner: '/*! <%= pkg.name %> - v<%= pkg.version %> - ' +
                '<%= grunt.template.today("yyyy-mm-dd") %> */' +
                "\n(function (window, undefined) {\n" +
                "\t'use strict';\n",
            footer: "\n\t// Export the SensorTag class\n" + 
                "\twindow.SensorTag = SensorTag;\n" + 
                "})(window);\n",
            process: function (src) {
                return src.split("\n").join("\n    ");
            }
        },
        dist: {
            src: [
                'src/Constants.js', 
                'src/SensorTag.js', 
                'src/SensorBase.js',
                'src/Sensors/IRTemperature.js',
                'src/Sensors/Accelerometer.js',
                'src/Sensors/Humidity.js',
                'src/Sensors/Magnetometer.js',
                'src/Sensors/BarometricPressure.js',
                'src/Sensors/Gyroscope.js',
                'src/Sensors/SimpleKey.js'
            ],
            dest: 'SensorTag.js'
        }
    },
    uglify: {
        my_target: {
            files: {
                'SensorTag.min.js': '<%= concat.dist.dest %>'
            }
        }
    },
    jshint: {
		files: [
            'Gruntfile.js', 
            '<%= concat.dist.src %>',
            '<%= concat.dist.dest %>'
        ]
    },
    watch: {
		files: ['<%= jshint.files %>'],
		tasks: ['concat','jshint']
    },
	jsdoc : {
        dist : {
            src: ['<%= concat.dist.src %>'], 
            options: {
                destination: 'doc'
            }
        }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-jsdoc');
  
  grunt.registerTask('default', ['concat', 'jshint', 'uglify']);

};