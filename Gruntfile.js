module.exports = function(grunt) {

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    jshint: {
		files: ['Gruntfile.js', 'SensorTag.js']
    },
    watch: {
		files: ['<%= jshint.files %>'],
		tasks: ['jshint']
    },
	jsdoc : {
        dist : {
            src: ['SensorTag.js'], 
            options: {
                destination: 'doc'
            }
        }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-jsdoc');
  
  grunt.registerTask('default', ['jshint']);

};