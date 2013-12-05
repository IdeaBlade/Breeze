module.exports = function(grunt) {

  var path = require('path');
  
  var msBuild = 'C:/Windows/Microsoft.NET/Framework/v4.0.30319/MSBuild.exe ';
  var msBuildOptions = '/p:Configuration=Release /verbosity:minimal';
  
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
          'TempHire'
        ];
        
	 
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
  	
	  msBuild: {
      breezeClient: {
        cwd: '../',
        msBuildOptions: msBuildOptions,
        solutionNames: ['Breeze-Build']
      },
      samples: {
        cwd: samplesDir,
        hasSolutionFolder: true,
        msBuildOptions: msBuildOptions,
        solutionNames: solutionNames,
      },
    
    },
  });


  grunt.loadNpmTasks('grunt-exec');
  
  grunt.registerMultiTask('msBuild', 'Execute MsBuild', function( ) {
    // dynamically build the exec tasks
    grunt.log.writeln('target: ' + this.target);
    grunt.log.writeln('cwd: ' + this.data.cwd);
    grunt.log.writeln('msBuildOptions: ' + this.data.msBuildOptions);
    var that = this;
    this.data.solutionNames.forEach(function(solutionName) {
	    
      grunt.log.writeln('Preparing solution build for: ' + solutionName);
      grunt.config('exec.msBuildClean-' + solutionName, getMsBuildProps(solutionName, that.data, 'Clean'));
		  grunt.config('exec.msBuildRebuild-' + solutionName, getMsBuildProps(solutionName, that.data, 'Rebuild'));
		  
    });
    grunt.task.run('exec');
  });

  grunt.loadNpmTasks('grunt-exec');  
   
  grunt.registerTask('default', ['msBuild']);

  function getMsBuildProps(solutionName, config, opt) {
     //solutionName = grunt.config.escape(solutionName);
     return {
		    cwd: config.hasSolutionFolder ? (config.cwd + solutionName) : config.cwd,
			  cmd: msBuild + '"' + solutionName + '.sln" ' + config.msBuildOptions + ' /t:' + opt
		  };
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