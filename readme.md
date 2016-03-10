#Overview

CLI Tool to generate Salesforce.com package.xml files based on git diff between two branches. 

##Install
```
git clone https://github.com/dlively1/sf-packager.git && cd sf-packager && npm link
```

##Usage
```
$ sfpackage master featureBranch ./deploy/
```
This will create a package at ./deploy/featureBranch/unpackaged/package.xml copying all files into directory 


You can also just write a package.xml by passing the -d flag
```
sfpackage master someFeatureBranch -d > ~/Desktop/package.xml
```
