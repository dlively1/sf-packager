exports.packageWriter = function(metadata, apiVersion) {

	apiVersion = apiVersion || '37.0';
	var xml = xmlBuilder.create('Package', { version: '1.0'});
		xml.att('xmlns', 'http://soap.sforce.com/2006/04/metadata');
        for (var type in metadata) {
            if (metadata.hasOwnProperty(type)) {

                var typeXml = xml.ele('types');
                var auraDir = [];

                metadata[type].forEach(function(item) {

                    if (type === 'aura') {
                        auraDir.push(item.substr(0, item.search('/')));
                    } else {
                        typeXml.ele('members', item);
                    }

                });

                var unique = Array.from(new Set(auraDir));
                if (auraDir.length > 0) {
                    for (i = 0; i < unique.length; i++) {
                        typeXml.ele('members', unique[i]);
                    }
                }
                typeXml.ele('name', metaMap[type]);
            }
        }
	xml.ele('version', apiVersion);

	return xml.end({pretty: true});
};

exports.buildPackageDir = function (dirName, name, metadata, packgeXML, destructive, cb) {

	var packageDir;
	var packageFileName;
	if (destructive) {
		packageDir = dirName + '/' + name + '/destructive';
		packageFileName = '/destructiveChanges.xml';
	} else {
		packageDir = dirName + '/' + name + '/unpackaged';
		packageFileName = '/package.xml';
	}

	//@todo -- should probably validate this a bit
	mkdirp(packageDir, (err) => {

		if(err) {
			return cb('Failed to write package directory ' + packageDir);
		}

		fs.writeFile(packageDir + packageFileName, packgeXML, 'utf8', (err) => {
			if(err) {
				return cb('Failed to write xml file');
			}

			return cb(null, packageDir);
		});

	});

};

exports.copyFiles = function(sourceDir, buildDir, files) {

    sourceDir = sourceDir + '/';
    buildDir = buildDir + '/';

    files.forEach(function(file) {

        if(file) {
            fs.copySync(sourceDir + file, buildDir + file.substr(4, file.length));

            if(file.endsWith('-meta.xml')) {
                var nonMeta = file.replace('-meta.xml', '');
                fs.copySync(sourceDir + nonMeta, buildDir + nonMeta.substr(4, nonMeta.length));
            }
            else {
                var metaExists = true;
                try {
                    fs.accessSync(sourceDir + file + '-meta.xml', fs.F_OK);
                }
                catch (err) {
                    console.log('does not exist');
                    metaExists = false;
                }

                if(metaExists) {
                    var meta = file + '-meta.xml';
                    fs.copySync(sourceDir + meta, buildDir + meta.substr(4, meta.length));
                }

            }
            if(file.indexOf('/aura/') != -1) {
                var auraComponent = file.replace(/.*(\/aura\/.*)\/.+/g, "$1");
                console.log('auraComponent: ' + auraComponent);
                console.log(sourceDir + auraComponent +  ' --> ' + buildDir + auraComponent);
                fs.copySync(sourceDir + 'src/' + auraComponent, buildDir + auraComponent, { recursive : true});
            }
        }

    });

};
