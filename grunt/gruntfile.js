module.exports = function(grunt) {

  var path = require('path');
  
  var msBuild = 'C:/Windows/Microsoft.NET/Framework/v4.0.30319/MSBuild.exe ';
  var msBuildOptions = ' /p:Configuration=Release /verbosity:minimal ';
  
  var samplesDir = '../Samples/';
  var tempDir = '../_temp/';
  var sampleNames = [
           'DocCode',
           'ToDo',
           'ToDo-Angular',
           'ToDo-AngularWithDI',
           'ToDo-Require',
           'NoDb',
           'CarBones',
           'Edmunds',
           'TempHire',
           'ODataBreezeJsSample'
        ];
  var sampleSolutionDirs = sampleNames.map(function(sn) {
    return samplesDir + sn + '/';
  });        
  var sampleSolutionFileNames = sampleNames.map(function(sn) {
    return samplesDir + sn + '/' + sn + '.sln';
  });
 
  var versionNum = getBreezeVersion();
  var zipFileName = '../breeze-runtime-' + versionNum + '.zip';
  var zipPlusFileName = '../breeze-runtime-plus-' + versionNum + '.zip';

  grunt.log.writeln('zipName: ' + zipPlusFileName);
  grunt.file.write(tempDir + 'version.txt', 'Version: ' + versionNum);
  grunt.log.writeln('localAppData: ' + process.env.LOCALAPPDATA);
  
  var nugetPackageNames = [
     'Breeze.WebApi', 
	   'Breeze.WebApi2.EF6',
     'Breeze.WebApi2.NH',
	   'Breeze.Client',
	   'Breeze.Server.WebApi2',
     'Breeze.Server.ContextProvider.EF6',
     'Breeze.Server.ContextProvider.NH',
     'Breeze.Server.ContextProvider'
	];
  
  var breezeDlls = [
    'Breeze.WebApi', 
    'Breeze.WebApi.EF', 
    'Breeze.WebApi.NH',
    'Breeze.ContextProvider', 
    'Breeze.ContextProvider.EF6',
    'Breeze.ContextProvider.NH',
    'Breeze.WebApi2'
  ];
  
  var tempPaths = [
     'bin','obj', 'packages','*_Resharper*','*.suo'
  ];
  
  
	 
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
        solutionFileNames: sampleSolutionFileNames,
      },
    },
    clean: {
      options: {
        // uncomment to test
        // "no-write": true,
        force: true,
      },
      samplePackages: ['../Samples/**/packages'],  
      samples:  join(sampleSolutionDirs, tempPaths),
      nupkgs: ['../Nuget.builds/**/*.nupkg']
    },
    copy: {
      testNupkg: {
        files: [ { 
          expand: true, 
          cwd: '../Nuget.builds', 
          src: ['**/*.nupkg' ], 
          flatten: true,
          dest: process.env.LOCALAPPDATA + '/Nuget/Cache' 
        }]
      }, 
      preZip: {
        files: [ 
          { expand: true, cwd: '../Breeze.Client', src: ['Scripts/breeze*.js'], dest: tempDir },
          { expand: true, cwd: '../Breeze.Client/Scripts/IBlade', src: ['b??_breeze.**js'], dest: tempDir + 'Scripts/Adapters/', 
            rename: function(dest, src) {
              return dest + 'breeze' + src.substring(src.indexOf('.'));
            }
          },
          { expand: true, cwd: '../Breeze.Client/Scripts/ThirdParty', src: ['q.**js'], dest: tempDir + 'Scripts' },
          { expand: true, cwd: '../Breeze.Client/Typescript', src: ['Typescript/breeze.d.ts'], dest: tempDir },
          { expand: true, cwd: '../Breeze.Client', src: ['Metadata/*.*'], dest: tempDir },
          
          { expand: true, cwd: '../Breeze.WebApi', src: ['Breeze.WebApi.dll'], dest: tempDir + 'Server'},
          { expand: true, cwd: '../Breeze.WebApi.EF', src: ['Breeze.WebApi.EF.dll'], dest: tempDir + 'Server'},
          { expand: true, cwd: '../Breeze.WebApi.NH', src: ['Breeze.WebApi.NH.dll'], dest: tempDir + 'Server'},
          
          { expand: true, cwd: '../Breeze.WebApi2', src: ['Breeze.WebApi2.dll'], dest: tempDir + 'Server'},
          { expand: true, cwd: '../Breeze.ContextProvider', src: ['Breeze.ContextProvider.dll'], dest: tempDir + 'Server'},
          { expand: true, cwd: '../Breeze.ContextProvider.EF6', src: ['Breeze.ContextProvider.EF6.dll'], dest: tempDir + 'Server'},
          { expand: true, cwd: '../Breeze.ContextProvider.NH', src: ['Breeze.ContextProvider.NH.dll'], dest: tempDir + 'Server'},
          
          { expand: true, cwd: '../Nuget.builds', src: ['readme.txt'], dest: tempDir },
          buildSampleCopy('../', tempDir , 'DocCode', ['**/Todos.sdf']),
          buildSampleCopy('../', tempDir , 'ToDo', ['**/*.sdf']),
          buildSampleCopy('../', tempDir , 'ToDo-Angular', ['**/*.sdf']),
          buildSampleCopy('../', tempDir , 'ToDo-AngularWithDI', ['**/*.sdf']),
          buildSampleCopy('../', tempDir , 'ToDo-Require', ['**/*.sdf']),
          buildSampleCopy('../', tempDir , 'NoDb'),
          buildSampleCopy('../', tempDir , 'Edmunds'),
          buildSampleCopy('../', tempDir , 'TempHire'),
          buildSampleCopy('../', tempDir , 'CarBones', ['**/*.mdf', '**/*.ldf']),
          buildSampleCopy('../', tempDir , 'ODataBreezeJsSample')
        ]
      },  
    },
    compress: {
      base: {
        options: { archive:  zipFileName, mode: 'zip', level: 9 },
        files: [ 
          { expand: true, cwd: tempDir, src: [ '**/**', '!Samples/**/*' ], dest: '/' } 
        ]
      },
      baseWithSamples: {
        options: { archive:  zipPlusFileName, mode: 'zip', level: 9  },
        files: [ 
          { expand: true, dot: true, cwd: tempDir, src: [ '**/*' ], dest: '/' } 
        ]
      }
    },
    updateFiles: {
      // copy all instance of files in source over like named files in dest.
      nugetScripts: { 
        src: ['../Breeze.Client/Scripts/breeze.*.js'] ,
        destFolders: ['../Nuget.builds']
      },
      nugetLibs: {
        src: breezeDlls.map(function(x) {
          return '../' + x + '/*.dll';
        }),
        destFolders: ['../Nuget.builds']
      }
    },
    
    nugetSolutionUpdate: {
      samples: {
        solutionFileNames: sampleSolutionFileNames
      }
    },
    buildNupkg: {
      build: { src: [ '../Nuget.builds/**/Default.nuspec' ] }
    },
    deployNupkg: {
      base: { src: ['../Nuget.builds/**/*.nupkg', '!../Nuget.builds/**/Breeze.Angular.*'] }
    },
    listFiles: {
      samples: {
        src: ['../Nuget.builds/**/Default.nuspec']
      }
    },
   
  });


  grunt.loadNpmTasks('grunt-exec');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-compress');
  
  grunt.registerMultiTask('nugetSolutionUpdate', 'nuget update', function( ) {   
    // dynamically build the exec tasks
    var that = this;
    
    this.data.solutionFileNames.forEach(function(solutionFileName) {
      execNugetInstall(solutionFileName, that.data);
      execNugetUpdate(solutionFileName, nugetPackageNames, that.data);
    });
  });
   
  grunt.registerMultiTask('msBuild', 'Execute MsBuild', function( ) {
    // dynamically build the exec tasks
    grunt.log.writeln('msBuildOptions: ' + this.data.msBuildOptions);
    var that = this;
    
    this.data.solutionFileNames.forEach(function(solutionFileName) {
      execMsBuild(solutionFileName, that.data);
    });
    
  });  
  
  grunt.registerMultiTask('updateFiles', 'update files to latest version', function() {
    var that = this;
    this.files.forEach(function(fileGroup) {
      fileGroup.src.forEach(function(srcFileName) {
        grunt.log.writeln('Updating from: ' + srcFileName);
        var baseName = path.basename(srcFileName);
        that.data.destFolders.forEach(function(df) {
          var destPattern = df + '/**/' + baseName;
          var destFiles = grunt.file.expand(destPattern);
          destFiles.forEach(function(destFileName) {
            grunt.log.writeln('           to: ' + destFileName);
            grunt.file.copy(srcFileName, destFileName);
          });
        });
      });
    });
  });
  
  grunt.registerMultiTask('deployNupkg', 'deploy nuget package', function() {   
    this.files.forEach(function(fileGroup) {
      fileGroup.src.forEach(function(fileName) {
        grunt.log.writeln('Deploy: ' + fileName);
        var folderName = path.dirname(fileName);
        runExec('deployNupkg', {
          cmd: 'nuget push ' + fileName 
        });
      });
    });
  });
  
  grunt.registerMultiTask('buildNupkg', 'package nuget files', function() {   
    this.files.forEach(function(fileGroup) {
      fileGroup.src.forEach(function(fileName) {
        packNuget(fileName);
      });
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

  grunt.registerTask('buildRelease', 
   ['msBuild:source', 'nugetSolutionUpdate', 'clean:samplePackages', 'msBuild:samples']);
  grunt.registerTask('packageRelease', 
   [ 'clean:samples', 'copy:preZip', 'compress']);    
  grunt.registerTask('packageNuget',   
   [ 'clean:nupkgs', 'updateFiles:nugetScripts', 'updateFiles:nugetLibs', 'buildNupkg', 'copy:testNupkg']);
  
  grunt.registerTask('default', ['buildRelease', 'packageRelease', 'packageNuget']);
    
  function getBreezeVersion() {
     var versionFile = grunt.file.read('../Breeze.Client/Scripts/IBlade/_head.jsfrag');    
     var regex = /\s+version:\s*"(\d.\d\d*.?\d*)"/
     var matches = regex.exec(versionFile);
     
     if (matches == null) {
        throw new Error('Version number not found');
     }
     // matches[0] is entire version string - [1] is just the capturing group.
     var versionNum = matches[1];
     grunt.log.writeln('version: ' + versionNum);
     return versionNum;
  }
  
  function join(a1, a2) {
    var result = [];
    a1.forEach(function(a1Item) {
      a2.forEach(function(a2Item) {
        result.push(a1Item + '**/' + a2Item);
      });
    });
    return result;
  }
  
  function packNuget(nuspecFileName) {
    var folderName = path.dirname(nuspecFileName);
    grunt.log.writeln('Nuspec folder: ' + folderName);
    
    var text = grunt.file.read(nuspecFileName);
    var folders = folderName.split('/');
    var folderId = folders[folders.length-1];
    
    text = text.replace(/{{version}}/g, versionNum);
    text = text.replace(/{{id}}/g, folderId);
    var destFileName = folderName + '/' + folderId + '.nuspec';
    grunt.log.writeln('nuspec file: ' + destFileName);
    grunt.file.write(destFileName, text);
    // "nuget pack $folderName.nuspec"
    runExec('nugetpack', {
      cwd: folderName,
      cmd: 'nuget pack ' + folderId + '.nuspec'
    });   

  }
  
  function buildSampleCopy(srcRoot, destRoot, sampleName, patternsToExclude) {
    var files = ['**/*', '**/.nuget/*'];
    if (patternsToExclude) {
      patternsToExclude.forEach(function(pattern) {   
        files.push('!' + pattern);
      });
    }
    var cmd = { 
      expand: true, 
      cwd: srcRoot + 'Samples/' + sampleName, 
      src: files,
      dest: destRoot + 'Samples/' + sampleName,
    }
    return cmd;
  }
  
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
    var baseCmd = 'nuget update ' + solutionFileName +  ' -FileConflictAction Ignore -Id ';
    
    nugetPackageNames.forEach(function(npn) {
      grunt.log.writeln('cmd: ' + baseCmd + npn);
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