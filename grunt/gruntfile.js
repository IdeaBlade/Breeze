module.exports = function(grunt) {

  var path = require('path');

  var srcDir = '../Samples/';
  var msBuild = 'C:/Windows/Microsoft.NET/Framework/v4.0.30319/MSBuild.exe '
	 
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
  	
	  msBuild: {
      solutions: {
        cwd: srcDir,
        msBuildOptions: '/p:Configuration=Release /verbosity:minimal',
        solutionNames: ['DocCode', 'ToDo'],
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
     return {
		    cwd: config.cwd + solutionName,
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