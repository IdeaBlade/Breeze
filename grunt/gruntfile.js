module.exports = function(grunt) {

  var path = require('path');
  
  var msBuild = 'C:/Windows/Microsoft.NET/Framework/v4.0.30319/MSBuild.exe ';
  var msBuildOptions = ' /p:Configuration=Release /verbosity:minimal ';
  
  var samplesDir = '../Samples/';
  var solutionNames = [
          'DocCode',
          'ToDo',
          'ToDo-Angular',
          'ToDo-AngularWithDI',
          'ToDo-Require',
          'NoDb',
          'CarBones',
          'Edmunds',
          'TempHire',
        ];
  var solutionFileNames = solutionNames.map(function(sn) {
    return samplesDir + sn + '/' + sn + '.sln';
  });
	 
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
  	
	  msBuild: {
      breezeClient: {
        msBuildOptions: msBuildOptions,
        solutionFileNames: ['../Breeze-Build.sln']
      },
      samples: {
        msBuildOptions: msBuildOptions,
        solutionFileNames: solutionFileNames,
      },
    },
    nugetUpdate: {
      samples: {
        cwd: samplesDir,
        solutionNames: solutionNames
      }
    },
    listFiles: {
      samples: {
        src: ['../Samples/**/packages.config']
      }
    }
  });


  grunt.loadNpmTasks('grunt-exec');
   
  grunt.registerMultiTask('msBuild', 'Execute MsBuild', function( ) {
    // dynamically build the exec tasks
    grunt.log.writeln('target: ' + this.target);
    grunt.log.writeln('msBuildOptions: ' + this.data.msBuildOptions);
    var that = this;
    var index = 0;
    this.data.solutionFileNames.forEach(function(solutionFileName) {
      configMsBuildProps(solutionFileName, index++, that.data);
    });
    grunt.task.run('exec');
  });
  
  // for debugging file patterns
  grunt.registerMultiTask('listFiles', 'List files', function() {
    grunt.log.writeln('target: ' + this.target);
     
    this.files.forEach(function(fileGroup) {
      fileGroup.src.forEach(function(fileName) {
        grunt.log.writeln('file: ' + fileName);
      });
    });
  });

  grunt.loadNpmTasks('grunt-exec');  
   
  grunt.registerTask('default', ['msBuild']);
  

  function configMsBuildProps(solutionFileName, index, config ) {
    grunt.log.writeln('Preparing solution build for: ' + solutionFileName);
    
    var cwd = path.dirname(solutionFileName);
    var baseName = path.basename(solutionFileName);
    var rootCmd = msBuild + '"' + baseName +'"' + config.msBuildOptions + ' /t:' 
    
    grunt.config('exec.msBuildClean-' + index, {
      cwd: cwd,
      cmd: rootCmd + 'Clean'
    });
    grunt.config('exec.msBuildRebuild-' + index, {
      cwd: cwd,
      cmd: rootCmd + 'Rebuild'
    });
  
  }
  
  function log(err, stdout, stderr, cb) {
    if (err) {
      grunt.log.write(err);
      grunt.log.write(stderr);
      throw new Error("Failed");
    }

    grunt.log.write(stdout);

    cb();
  }


};