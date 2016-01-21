#!/usr/bin/env node
 
/**
 * Quick tool to parse git diff and build a package.xml file from it.
 * This is useful for using the MavensMate deployment tool and selecting the existing package.xml file
 */
 
var program = require('commander');
var util  = require('util'),
    spawn = require('child_process').spawn,
    packageWriter = require('./lib/metaUtils').packageWriter,
    buildPackageDir = require('./lib/metaUtils').buildPackageDir,
    packageInfo = require('./package.json')

 
program
	.arguments('<compare> <branch> <target>')
  	.version(packageInfo.version)
  	.option('-d, --dryrun', 'Only print the package.xml that would be generated')
  	.action(function(compare, branch, target) {

  		if(! branch || ! compare) {
  			console.error('branch and target branch are both required');
  			program.help();
  			process.exit(1);
  		}

      var dryrun = false;
      if(program.dryrun) {
        dryrun = true;
      }

    	var gitDiff = spawn('git', ['diff','--name-only', compare, branch]);
    	gitDiff.stdout.on('data', function(data) {

    	var buff = new Buffer(data),
    			files = buff.toString('utf8'),
    			fileList = [];
    		
    		//defines the different member types
    		var metaBag = {};

    		fileList = files.split('\n');
    		fileList.forEach(function(fileName) {

    			if(fileName) {
    				var parts = fileName.split('/');
    				if(! metaBag.hasOwnProperty(parts[1])) {
    					metaBag[parts[1]] = [];
    				}
    				metaBag[parts[1]].push(parts[2].split('.')[0]);
    			}


    		});

        //build package.xml file
        var packageXML = packageWriter(metaBag);
        if(dryrun) {
          console.log(packageXML);
          process.exit(0);
        }

        console.log('building in dir %s', target);

        // /buildPackageDir = function (dirName, name, metadata, packgeXML, cb)
        buildPackageDir(target, branch, metaBag, packageXML, (err, data) => {

          if(err) {
            return console.error(err);
          }

          console.log('Successfully created package.xml');

        });
    		

    	});
    	gitDiff.stderr.on('data', function(data) {
    		console.error('stderror:: ' + data);
    	});

  	});


program.parse(process.argv);
 


