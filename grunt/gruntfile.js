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
  
  var nugetPackageNames = [
     'Breeze.WebApi', 
	   'Breeze.WebApi2.EF6',
	   'Breeze.Client',
	   'Breeze.Server.WebApi2',
     'Breeze.Server.ContextProvider.EF6',
     'Breeze.Server.ContextProvider'
	];
  
  var nuPackNames = 'Breeze.WebApi, Breeze.WebApi2.EF6'
	 
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
  	
	  msBuild: {
      source: {
        msBuildOptions: msBuildOptions,
        solutionFileNames: ['../Breeze-Build.sln']
      },
      samples: {
        msBuildOptions: msBuildOptions,
        solutionFileNames: solutionFileNames,
      },
    },
    clean: {
        options: {
        // "no-write": true,
        force: true,
      },
      samples: ['../Samples/**/packages']      
    },
    nugetUpdate: {
      samples: {
        solutionFileNames: solutionFileNames
      }
    },
    listFiles: {
      samples: {
        src: ['../Samples/**/packages.config']
      }
    }
  });


  grunt.loadNpmTasks('grunt-exec');
  
  grunt.registerMultiTask('nugetUpdate', 'nuget update', function( ) {
    
    // dynamically build the exec tasks
    grunt.log.writeln('target: ' + this.target);
    var that = this;
    
    this.data.solutionFileNames.forEach(function(solutionFileName) {
      execNugetInstall(solutionFileName, that.data);
      execNugetUpdate(solutionFileName, nugetPackageNames, that.data);
    });
    
    
  });
   
  grunt.registerMultiTask('msBuild', 'Execute MsBuild', function( ) {
    // dynamically build the exec tasks
    grunt.log.writeln('target: ' + this.target);
    grunt.log.writeln('msBuildOptions: ' + this.data.msBuildOptions);
    var that = this;
    
    this.data.solutionFileNames.forEach(function(solutionFileName) {
      execMsBuild(solutionFileName, that.data);
    });
    
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
  grunt.loadNpmTasks('grunt-contrib-clean');
   
  grunt.registerTask('default', ['msBuild:source', 'nugetUpdate', 'clean', 'msBuild:samples']);
  
  function execNugetInstall(solutionFileName, config ) {
    
    var solutionDir = path.dirname(solutionFileName);
    var packagesDir = solutionDir + '/packages';

    var configFileNames = grunt.file.expand(solutionDir + '/**/packages.config');
    configFileNames.forEach(function(fn) {
      grunt.log.writeln('Preparing nuget install for file: ' + fn);
      var cmd = 'nuget install ' + fn + ' -OutputDirectory ' + packagesDir;
      // grunt.log.writeln('cmd: ' + cmd);
      runExec('nugetInstall', {
        cmd: cmd
      });
    });
  }
  
  function execNugetUpdate(solutionFileName, nugetPackageNames, config) {
    var baseCmd = 'nuget update ' + solutionFileName + ' -Id ';
    
    nugetPackageNames.forEach(function(npn) {
      runExec('nugetUpdate', {
        cmd: baseCmd + npn
      });
    });
  }

  function execMsBuild(solutionFileName, config ) {
    grunt.log.writeln('Executing solution build for: ' + solutionFileName);
    
    var cwd = path.dirname(solutionFileName);
    var baseName = path.basename(solutionFileName);
    var rootCmd = msBuild + '"' + baseName +'"' + config.msBuildOptions + ' /t:' 
    
    runExec('msBuildClean', {
      cwd: cwd,
      cmd: rootCmd + 'Clean'
    });
    runExec('msBuildRebuild', {
      cwd: cwd,
      cmd: rootCmd + 'Rebuild'
    });

  }
  
  var index = 0;
  
  function runExec(name, config) {
    var name = name+'-'+index++;
    grunt.config('exec.' + name, config);
    grunt.task.run('exec:' + name);
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