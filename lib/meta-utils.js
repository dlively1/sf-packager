const fs = require('fs-extra');
const mkdirp = require('mkdirp');
const console = require('console');

exports.buildPackageDir = function (dirName, name, metadata, packageXML, destructive, cb) {
  let packageDir;
  let packageFileName;
  if (destructive) {
    packageDir = `${dirName}/${name}/destructive`;
    packageFileName = '/destructiveChanges.xml';
  } else {
    packageDir = `${dirName}/${name}/unpackaged`;
    packageFileName = '/package.xml';
  }

  // @todo -- should probably validate this a bit
  mkdirp(packageDir, (err) => {
    if (err) {
      return cb(`Failed to write package directory ${packageDir}`);
    }

    fs.writeFile(packageDir + packageFileName, packageXML, 'utf8', (err) => {
      if (err) {
        return cb('Failed to write xml file');
      }
    });
    // migration tool requires an empty package.xml for destructive changes
    if (destructive) {
      fs.writeFile(`${packageDir}/package.xml`, exports.packageWriter(null), 'utf8', (err) => {
        if (err) {
          return cb('Failed to write xml file');
        }

        return cb(null, packageDir);
      });
    } else {
      return cb(null, packageDir);
    }
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
