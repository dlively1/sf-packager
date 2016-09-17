#!/usr/bin/env node

/**
 * CLI tool to parse git diff and build a package.xml file from it.
 * This is useful for using the MavensMate deployment tool and selecting the existing package.xml file
 * Also used in larger orgs to avoid deploying all metadata in automated deployments
 *
 * usage:
 *  $ sfpackage master featureBranch ./deploy/
 *
 *  This will create a file at ./deploy/featureBranch/unpackaged/package.xml
 */

var program = require('commander');
var util = require('util'),
    spawn = require('child_process').spawn,
    packageWriter = require('./lib/metaUtils').packageWriter,
    buildPackageDir = require('./lib/metaUtils').buildPackageDir,
    copyFiles = require('./lib/metaUtils').copyFiles,
    packageVersion = require('./package.json').version;


program
    .arguments('<compare> <branch> [target]')
    .version(packageVersion)
    .option('-d, --dryrun', 'Only print the package.xml that would be generated')
    .action(function (compare, branch, target) {

        if (!branch || !compare) {
            console.error('branch and target branch are both required');
            program.help();
            process.exit(1);
        }

        var dryrun = false;
        if (program.dryrun) {
            dryrun = true;
        }

        if (!dryrun && !target) {
            console.error('target required when not dry-run');
            program.help();
            process.exit(1);
        }

        var currentDir = process.cwd();
        var gitDiff = spawn('git', ['diff', '--name-only', compare, branch]);
        gitDiff.stdout.on('data', function (data) {

            var buff = new Buffer(data),
                files = buff.toString('utf8'),
                fileListForCopy = [],
                fileList = [];

            //defines the different member types
            var metaBag = {};

            fileList = files.split('\n');
            fileList.forEach(function (fileName, index) {

                //ensure file is inside of src directory of project
                if (fileName && fileName.substring(0,3) === 'src') {

                    //ignore changes to the package.xml file
                    if(fileName === 'src/package.xml') {
                        return;
                    }

                    // add filename to array to be copied
                    fileListForCopy.push(fileName);

                    var parts = fileName.split('/');
                    if (!metaBag.hasOwnProperty(parts[1])) {
                        metaBag[parts[1]] = [];
                    }

                    var meta = parts[2].split('.')[0];
                    if (metaBag[parts[1]].indexOf(meta) === -1) {
                        metaBag[parts[1]].push(meta);
                    }

                }
            });

            //build package.xml file
            var packageXML = packageWriter(metaBag);
            if (dryrun) {
                console.log(packageXML);
                process.exit(0);
            }

            console.log('building in dir %s', target);

            buildPackageDir(target, branch, metaBag, packageXML, (err, buildDir) => {

                if (err) {
                    return console.error(err);
                }

                copyFiles(currentDir, buildDir, fileListForCopy);
                console.log('Successfully created package package.xml in %s',buildDir);

            });


        });
        gitDiff.stderr.on('data', function (data) {
            console.error('stderror:: ' + data);
        });

    });


program.parse(process.argv);
