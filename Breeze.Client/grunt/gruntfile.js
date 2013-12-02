module.exports = function(grunt) {

  var mapPath = function(dir, fileNames) {
    return fileNames.map(function(fileName) {
    	return dir + fileName;
    });
  };

  var srcDir = "../Scripts/IBlade/";
  var baseFileNames = [ "_head.jsfrag", "a??_*.js", "_tail.jsfrag"];
  var fileNames = [ "_head.jsfrag", "a??_*.js", "b??_*.js", "_tail.jsfrag"];

  
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';',
      },
      base: {
        src: mapPath(srcDir, baseFileNames),
        dest: 'breeze.base.debug.js',
      },
      def: {
        src: mapPath(srcDir, fileNames),
        dest: 'breeze.debug.js',
      }
    },
    uglify: {
      options: {
        report: 'min',
      },
      base: {
        files: {
          'breeze.min.js': ['breeze.debug.js']
        }
      },
      def: {
        files: {
          'breeze.min.base.js': ['breeze.base.debug.js']
	}
      },
    },
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  
  // Default task(s).
  grunt.registerTask('default', ['concat', "uglify"]);

};