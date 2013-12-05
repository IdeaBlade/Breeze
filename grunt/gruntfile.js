module.exports = function(grunt) {

  var path = require('path');

  var srcDir = '../Samples/';
  var msBuild = 'C:/Windows/Microsoft.NET/Framework/v4.0.30319/MSBuild.exe '
  var solutionName;
  var msBuildOptions = '/p:Configuration=Release /verbosity:minimal'

  // $clean = $msbuild + " `"$solutionFileName`" " + $options + " /t:Clean"
  // $build = $msbuild + " `"$solutionFileName`" " + $options + " /t:reBuild"
	 
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
  	
	  msBuild: {
      projects: ['DocCode', 'ToDo'],
    },
  });

  
  grunt.loadNpmTasks('grunt-exec');
  
  grunt.registerMultiTask('msBuild', 'Execute MsBuild', function( ) {
    grunt.log.writeln('this.target: ' + this.target);
    this.data.forEach(function(solutionName) {
	    
      grunt.log.writeln('Preparing solution build for: ' + solutionName);
      grunt.config('exec.msBuildClean-' + solutionName, getMsBuildProps(solutionName, 'Clean'));
		  grunt.config('exec.msBuildRebuild-' + solutionName, getMsBuildProps(solutionName, 'Rebuild'));
		  
    });
    grunt.task.run('exec');
  });

  grunt.loadNpmTasks('grunt-exec');  
   
  grunt.registerTask('default', ['msBuild']);

  function getMsBuildProps(solutionName, opt) {
     return {
		    cwd: srcDir +  solutionName,
			  cmd: msBuild + '"' + solutionName + '.sln" ' + msBuildOptions + ' /t:' + opt
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

  function mapPath(dir, fileNames) {
    return fileNames.map(function(fileName) {
    	return dir + fileName;
    });
  };


};