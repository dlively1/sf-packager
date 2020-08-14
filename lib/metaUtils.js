const xmlBuilder = require('xmlbuilder');
const fs = require('fs-extra');
const mkdirp = require('mkdirp');
const console = require('console');

/**
 * Mapping of file name to Metadata Definition
 */
// @todo -- finish out all the different metadata types
const metaMap = {
  applications: 'CustomApplication',
  appMenus: 'AppMenu',
  approvalProcesses: 'ApprovalProcess',
  assignmentRules: 'AssignmentRules',
  aura: 'AuraDefinitionBundle',
  authproviders: 'AuthProvider',
  autoResponseRules: 'AutoResponseRules',
  classes: 'ApexClass',
  communities: 'Community',
  components: 'ApexComponent',
  connectedApps: 'ConnectedApp',
  customPermissions: 'CustomPermission',
  customMetadata: 'CustomMetadata',
  dashboards: 'Dashboard',
  documents: 'Document',
  email: 'EmailTemplate',
  escalationRules: 'EscalationRules',
  flowDefinitions: 'FlowDefinition',
  flows: 'Flow',
  groups: 'Group',
  homePageComponents: 'HomePageComponent',
  homePageLayouts: 'HomePageLayout',
  installedPackages: 'InstalledPackage',
  labels: 'CustomLabels',
  layouts: 'Layout',
  letterhead: 'Letterhead',
  managedTopics: 'ManagedTopics',
  matchingRules: 'MatchingRule',
  namedCredentials: 'NamedCredential',
  networks: 'Network',
  objects: 'CustomObject',
  objectTranslations: 'CustomObjectTranslation',
  pages: 'ApexPage',
  permissionsets: 'PermissionSet',
  profiles: 'Profile',
  queues: 'Queue',
  quickActions: 'QuickAction',
  remoteSiteSettings: 'RemoteSiteSetting',
  reports: 'Report',
  reportTypes: 'ReportType',
  roles: 'Role',
  staticresources: 'StaticResource',
  triggers: 'ApexTrigger',
  tabs: 'CustomTab',
  sharingRules: 'SharingRules',
  sharingSets: 'SharingSet',
  siteDotComSites: 'SiteDotCom',
  sites: 'CustomSite',
  workflows: 'Workflow',
  weblinks: 'CustomPageWebLink',
};

exports.packageWriter = function (metadata, apiVersion) {
  apiVersion = apiVersion || '40.0';
  const xml = xmlBuilder.create('Package', { version: '1.0' });
  xml.att('xmlns', 'http://soap.sforce.com/2006/04/metadata');

  for (const type in metadata) {
    if (Object.prototype.hasOwnProperty.call(metadata, type)) {
      const typeXml = xml.ele('types');
      metadata[type].forEach((item) => {
        typeXml.ele('members', item);
      });

      typeXml.ele('name', metaMap[type]);
    }
  }
  xml.ele('version', apiVersion);

  return xml.end({ pretty: true });
};

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
