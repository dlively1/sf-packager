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
const program = require('commander');
const { sfdcPackage, metaUtils, git, parseDiff } = require('./lib')
const packageVersion = require('./package.json').version;
const console = require('console');
const process = require('process');

program
    .arguments('<compare> <branch> [target]')
    .version(packageVersion)
    .option('-d, --dryrun', 'Only print the package.xml and destructiveChanges.xml that would be generated')
    .option('-p, --pversion [version]', 'Salesforce version of the package.xml', parseInt)
    .action((compare, branch, target) => {
        if (!branch || !compare) {
            console.error('branch and target branch are both required');
            program.help();
            process.exit(1);
        }

        const {dryrun} = program;

        if (!dryrun && !target) {
            console.error('target required when not dry-run');
            program.help();
            process.exit(1);
        }

        const fileList = git.diff(compare, branch);
        const {changedMetaBag, deletedMetaBag, changeList} = metaUtils.parseDiff(fileList);

        // build package file content
        const packageXML = sfdcPackage.writer(changedMetaBag, program.pversion);
        // build destructiveChanges file content
        const destructiveXML = sfdcPackage.writer(deletedMetaBag, program.pversion);
        if (dryrun) {
            console.log('\npackage.xml\n');
            console.log(packageXML);
            console.log('\ndestructiveChanges.xml\n');
            console.log(destructiveXML);
            process.exit(0);
        }

        console.log('Building in directory %s', target);

        metaUtils
            .buildPackageDir(target, branch, changedMetaBag, packageXML)
            .then((buildDir) => {
                metaUtils.copyFiles(process.cwd(), buildDir, changeList);
                console.log('Successfully created package.xml and files in %s', buildDir);
            })
            .catch((err) => console.error(err));

        // if files have been deleted create a destructive change set
        if (Object.keys(deletedMetaBag).length > 0) {
            metaUtils
                .buildPackageDir(target, branch, deletedMetaBag, destructiveXML, true)
                .then((buildDir) => console.log('Successfully created destructiveChanges.xml in %s', buildDir))
                .catch((err) => console.error(err))
        }
    });

program.parse(process.argv);
