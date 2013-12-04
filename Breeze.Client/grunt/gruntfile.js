module.exports = function(grunt) {

  var path = require('path');

  function log(err, stdout, stderr, cb) {
	if (err) {
	  grunt.log.write(err);
	  grunt.log.write(stderr);
	  throw new Error("Failed");
	}

	grunt.log.write(stdout);

    cb();
  }

  var mapPath = function(dir, fileNames) {
    return fileNames.map(function(fileName) {
    	return dir + fileName;
    });
  };

  var breezeRootDir = '../../';
  var srcDir = '../Scripts/IBlade/';
  var destDir = '../Scripts/';
  var baseFileNames = [ '_head.jsfrag', 'a??_*.js', '_tail.jsfrag'];
  var fileNames = [ '_head.jsfrag', 'a??_*.js', 'b??_*.js', '_tail.jsfrag'];

  
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    concat: {
      options: {
        separator: ';',
      },
      base: {
        src: mapPath(srcDir, baseFileNames),
        dest: destDir+'breeze.base.debug.js',
      },
      def: {
        src: mapPath(srcDir, fileNames),
        dest: destDir+'breeze.debug.js',
      }
    },
    uglify: {
      options: {
        report: 'min',
      },
      base: {
		src: [destDir+'breeze.debug.js'],
        dest: destDir+'breeze.min.js'
      },
      def: {
        src: [destDir+'breeze.base.debug.js'],
		dest: destDir+'breeze.base.min.js'
      },
    },
    yuidoc: {
      compile: {
        options: {
          paths:     srcDir,
          themedir:  '../ApiDocs-theme',
          outdir:    '../ApiDocs'
        }
      }
    },
    shell: {                             
      options: {
        stdout: true,
		stderr: true,
		callback: log,
      },
      buildIntellisense: {                     
        options: {
          execOptions: {
            cwd: '../Intellisense',
          }
        },
		command: 'node server.js'
      },
    },
	
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-yuidoc');
  grunt.loadNpmTasks('grunt-shell');
  
  // No intellisense.
  grunt.registerTask('basic', ['concat', 'uglify', 'yuidoc']);
  // Default task(s).
  grunt.registerTask('default', ['concat', 'uglify', 'yuidoc', 'shell']);
  

};