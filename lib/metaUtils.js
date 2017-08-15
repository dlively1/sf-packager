
var xmlBuilder = require('xmlbuilder');
var fs = require('fs-extra');
var mkdirp = require('mkdirp');

/**
 * Mapping of file name to Metadata Definition
 */
//@todo -- finish out all the different metadata types
var metaMap = {
	'applications': 'CustomApplication',
	'appMenus': 'AppMenu',
	'approvalProcesses': 'ApprovalProcess',
	'assignmentRules': 'AssignmentRules',
	'aura': 'AuraDefinitionBundle',
	'authproviders': 'AuthProvider',
	'autoResponseRules': 'AutoResponseRules',
	'classes': 'ApexClass',
	'communities': 'Community',
	'components': 'ApexComponent',
	'connectedApps': 'ConnectedApp',
	'customPermissions': 'CustomPermission',
	'customMetadata': 'CustomMetadata',
	'dashboards': 'Dashboard',
	'documents': 'Document',
	'email': 'EmailTemplate',
	'escalationRules': 'EscalationRules',
	'flowDefinitions': 'FlowDefinition',
	'flows': 'Flow',
	'groups': 'Group',
	'homePageComponents': 'HomePageComponent',
	'homePageLayouts': 'HomePageLayout',
	'installedPackages': 'InstalledPackage',
	'labels': 'CustomLabels',
	'layouts': 'Layout',
	'letterhead': 'Letterhead',
	'managedTopics': 'ManagedTopics',
	'matchingRules': 'MatchingRule',
	'namedCredentials': 'NamedCredential',
	'networks': 'Network',
	'objects': 'CustomObject',
	'objectTranslations': 'CustomObjectTranslation',
	'pages': 'ApexPage',
	'permissionsets': 'PermissionSet',
	'profiles': 'Profile',
	'queues': 'Queue',
	'quickActions': 'QuickAction',
	'remoteSiteSettings': 'RemoteSiteSetting',
	'reports': 'Report',
	'reportTypes': 'ReportType',
	'roles': 'Role',
	'staticresources': 'StaticResource',
	'triggers': 'ApexTrigger',
	'tabs': 'CustomTab',
	'sharingRules': 'SharingRules',
	'sharingSets': 'SharingSet',
	'siteDotComSites': 'SiteDotCom',
	'sites': 'CustomSite',
	'workflows': 'Workflow',
	'weblinks': 'CustomPageWebLink',
};

exports.packageWriter = function(metadata, apiVersion) {

	apiVersion = apiVersion || '37.0';
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

        }

    });

};
