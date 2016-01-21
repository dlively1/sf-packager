
var xmlBuilder = require('xmlbuilder');
var fs = require("fs");
var getDirName = require("path").dirname;
var mkdirp = require('mkdirp');

/**
 * Mapping of file name to Metadata Definition
 */
//@todo -- finish out all the different metadata types
var metaMap = {
	'classes': 'ApexClass',
	'triggers': 'ApexTrigger',
	'pages': 'ApexPage',
	'components': 'ApexComponent',
	'approvalProcesses': 'ApprovalProcess',
	'aura': 'AuraDefinitionBundle',
	'applications': 'CustomApplication',
	'objects': 'CustomObject',
	'tabs': 'CustomTab',
	'layouts': 'Layout',
	'queues': 'Queue',
	'quickActions': 'QuickAction',
	'staticresources': 'StaticResource',
	'workflows': 'Workflow',
	'weblinks': 'CustomPageWebLink'
};



exports.packageWriter = function(metadata, apiVersion) {

	apiVersion = apiVersion || '34.0';
	
	var xml = xmlBuilder.create('Package', { version: '1.0'});
		xml.att('xmlns', 'http://soap.sforce.com/2006/04/metadata');

	for (var type in metadata) {

		if (metadata.hasOwnProperty(type)) {

			var typeXml = xml.ele('types');
				

			metadata[type].forEach(function(item) {
				typeXml.ele('members', item);
			});

			typeXml.ele('name', metaMap[type]);
		}

	}
	xml.ele('version', apiVersion);

	return xml.end({pretty: true});
}

exports.buildPackageDir = function (dirName, name, metadata, packgeXML, cb) {

	var	packageDir = dirName + '/' + name + '/unpackaged';

	//@todo -- should probably validate this a bit
	mkdirp(packageDir, (err) => {

		if(err) {
			return cb('Failed to write package directory ' + packageDir);
		}


		fs.writeFile(packageDir + '/package.xml', packgeXML, 'utf8', (err) => {
			if(err) {
				return cb('Failed to write package.xml file');
			}

			return cb(null, packageDir);
		});


	});


}
