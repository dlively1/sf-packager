const fs = require('fs-extra');
const mkdirp = require('mkdirp');
const console = require('console');
const process = require('process');

exports.buildPackageDir = function (dirName, name, metadata, packageXML, destructive) {
  return new Promise((resolve, reject) => {
    let packageDir;
    let packageFileName;
    if (destructive) {
      packageDir = `${dirName}/${name}/destructive`;
      packageFileName = '/destructiveChanges.xml';
    } else {
      packageDir = `${dirName}/${name}/unpackaged`;
      packageFileName = '/package.xml';
    }

    mkdirp(packageDir, (err) => {
      if (err) {
        return reject(new Error(`Failed to write package directory ${packageDir}`));
      }

      fs.writeFile(packageDir + packageFileName, packageXML, 'utf8', (err) => {
        if (err) {
          return reject(new Error('Failed to write xml file'));
        }
      });

      // migration tool requires an empty package.xml for destructive changes
      if (destructive) {
        fs.writeFile(`${packageDir}/package.xml`, exports.packageWriter(null), 'utf8', (err) => {
          if (err) {
            return reject(new Error('Failed to write xml file'));
          }

          return resolve(packageDir);
        });
      } else {
        return resolve(packageDir);
      }
    });
  });
};

exports.copyFiles = function (sourceDir, buildDir, files) {
  sourceDir = `${sourceDir}/`;
  buildDir = `${buildDir}/`;

  files.forEach((file) => {
    if (file) {
      fs.copySync(sourceDir + file, buildDir + file.substr(4, file.length));

      if (file.endsWith('-meta.xml')) {
        const nonMeta = file.replace('-meta.xml', '');
        fs.copySync(sourceDir + nonMeta, buildDir + nonMeta.substr(4, nonMeta.length));
      } else {
        let metaExists = true;
        try {
          fs.accessSync(`${sourceDir + file}-meta.xml`, fs.F_OK);
        } catch (err) {
          console.log(`${sourceDir + file}-meta.xml does not exist`);
          metaExists = false;
        }

        if (metaExists) {
          const meta = `${file}-meta.xml`;
          fs.copySync(sourceDir + meta, buildDir + meta.substr(4, meta.length));
        }
      }
    }
  });
};

exports.parseDiff = function (fileList, logger) {
  const metaBag = {};
  const metaBagDestructive = {};
  const fileListForCopy = [];

  fileList.forEach((gitDiffLine) => {
    // get the git operation
    const operation = gitDiffLine.slice(0, 1);

    // separate the giDiffLine into its various components
    const gitDiffLineParts = gitDiffLine.split('\t');
    const fileName = gitDiffLineParts[gitDiffLineParts.length - 1];

    // skip files outside of src directory or changes to the package.xml file.
    if (!fileName || fileName.substring(0, 3) !== 'src' || fileName === 'src/package.xml') {
      return;
    }
    const parts = fileName.split('/');
    // Check for invalid fileName, likely due to data stream exceeding buffer size resulting in incomplete string
    // TODO: need a way to ensure that full fileNames are processed - increase buffer size??
    if (parts[2] === undefined) {
      error(`File name "${fileName}" cannot be processed, exiting`);
    }

    let meta;

    if (parts.length === 4) {
      // Processing metadata with nested folders e.g. emails, documents, reports
      meta = `${parts[2]}/${parts[3].split('.')[0]}`;
    } else {
      // Processing metadata without nested folders. Strip -meta from the end.
      meta = parts[2].split('.')[0].replace('-meta', '');
    }

    if (operation === 'A' || operation === 'M' || operation === 'R') {
      // file was added or modified - add fileName to array for unpackaged and to be copied
      // ant migration tool requires the whole lightning bundle to be included, even if only
      // one of the bundle components change.
      if (parts[1] === 'aura') {
        const bundle = fs.readdirSync(`${parts[0]}/${parts[1]}/${parts[2]}`);
        logger.debug(`File was added or modified in a lightning bundle: ${fileName}`)
        bundle.forEach((fileName) => {
          fileListForCopy.push(`${parts[0]}/${parts[1]}/${parts[2]}/${fileName}`);
        });
      } else {
        logger.debug(`File was added or modified: ${fileName}`);
        fileListForCopy.push(fileName);
      }

      if (!Object.prototype.hasOwnProperty.call(metaBag, parts[1])) {
        metaBag[parts[1]] = [];
      }

      if (parts[1] === 'aura') {
        if (metaBag[parts[1]].indexOf('*') === -1) {
          metaBag[parts[1]].push('*');
        }
      } else if (metaBag[parts[1]].indexOf(meta) === -1) {
        metaBag[parts[1]].push(meta);
      }
    } else if (operation === 'D') {
      // file was deleted
      logger.debug(`File was deleted ${fileName}`);

      if (!Object.prototype.hasOwnProperty.call(metaBagDestructive, parts[1])) {
        metaBagDestructive[parts[1]] = [];
      }

      if (metaBagDestructive[parts[1]].indexOf(meta) === -1) {
        metaBagDestructive[parts[1]].push(meta);
      }
    } else {
      // if an unknown operation is detected fail the command for manual investigation.
      error(`Unknown operation error. Operation [${operation}] at ${fileName}`)
    }
  });

  return {
    changedMetaBag: metaBag,
    deletedMetaBag: metaBagDestructive,
    changeList: fileListForCopy
  }
}

function error(errMsg) {
  console.error('error: ' + errMsg);
  process.exit(1);
}
