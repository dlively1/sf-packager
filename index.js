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
 *  and copy each metadata item into a matching folder.
 *  Also if any deletes occurred it will create a file at ./deploy/featureBranch/destructive/destructiveChanges.xml
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
    .option('-d, --dryrun', 'Only print the package.xml and destructiveChanges.xml that would be generated')
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
        var gitDiff = spawn('git', ['diff', '--name-status', compare, branch]);
        gitDiff.stdout.on('data', function (data) {

            var buff = new Buffer(data),
                files = buff.toString('utf8'),
                fileListForCopy = [],
                fileList = [];

            //defines the different member types
            var metaBag = {};
            var metaBagDestructive = {};
            var deletesHaveOccurred = false;

            fileList = files.split('\n');
            fileList.forEach(function (fileName, index) {

                // get the git operation
                var operation = fileName.slice(0,1);
                // remove the operation and spaces from fileName
                fileName = fileName.slice(1).trim();

                //ensure file is inside of src directory of project
                if (fileName && fileName.substring(0,3) === 'src') {

                    //ignore changes to the package.xml file
                    if(fileName === 'src/package.xml') {
                        return;
                    }

                    var parts = fileName.split('/');
                    // Check for invalid fileName, likely due to data stream exceeding buffer size resulting in incomplete string
                    // TODO: need a way to ensure that full fileNames are processed - increase buffer size??
                    if (parts[2] === undefined) {
                        console.error('File name "%s" cannot be processed, likely too many files in diff, exiting', fileName);
                        process.exit(1);
                    }

                    var meta = parts[2].split('.')[0];
                    if (operation === 'A' || operation === 'M') {
                        // file was added or modified - add fileName to array for unpackaged and to be copied
                        console.log('File was added or modified: %s', fileName);
                        fileListForCopy.push(fileName);

                        if (!metaBag.hasOwnProperty(parts[1])) {
                            metaBag[parts[1]] = [];
                        }

                        if (metaBag[parts[1]].indexOf(meta) === -1) {
                            metaBag[parts[1]].push(meta);
                        }
                    } else if (operation === 'D') {
                        // file was deleted
                        console.log('File was deleted: %s', fileName);
                        deletesHaveOccurred = true;

                        if (!metaBagDestructive.hasOwnProperty(parts[1])) {
                            metaBagDestructive[parts[1]] = [];
                        }

                        if (metaBagDestructive[parts[1]].indexOf(meta) === -1) {
                            metaBagDestructive[parts[1]].push(meta);
                        }
                    } else {
                        // situation that requires review
                        return console.error('Operation on file needs review: %s', fileName);
                    }
                }
            });

            //build package file content
            var packageXML = packageWriter(metaBag);
            //build destructiveChanges file content
            var destructiveXML = packageWriter(metaBagDestructive);
            if (dryrun) {
                console.log('\npackage.xml\n');
                console.log(packageXML);
                console.log('\ndestructiveChanges.xml\n');
                console.log(destructiveXML);
                process.exit(0);
            }

            console.log('building in dir %s', target);

            buildPackageDir(target, branch, metaBag, packageXML, false, (err, buildDir) => {

                if (err) {
                    return console.error(err);
                }

                copyFiles(currentDir, buildDir, fileListForCopy);
                console.log('Successfully created package.xml and files in %s',buildDir);

            });

            if (deletesHaveOccurred) {
                buildPackageDir(target, branch, metaBagDestructive, destructiveXML, true, (err, buildDir) => {

                    if (err) {
                        return console.error(err);
                    }

                    console.log('Successfully created destructiveChanges.xml in %s',buildDir);
                });
            }

        });
        gitDiff.stderr.on('data', function (data) {
            console.error('stderror:: ' + data);
        });

    });


program.parse(process.argv);
