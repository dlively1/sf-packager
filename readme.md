# Overview

CLI Tool to generate Salesforce.com package.xml (and destructiveChange.xml) files based on git diff between two branches, commits, or tags. 

## Install

```
npm install -g sf-packager
```

## Usage

```
$ sfpackage destinationBranch sourceBranch ./deploy/
```

This will create a package at ./deploy/sourceBranch/unpackaged/package.xml copying all files into directory.

If any deletes occurred will also create ./deploy/sourceBranch/destructive/destructiveChanges.xml

You can force a specific version for the package.xml with the -p flag

```
sfpackage destinationBranch sourceBranch -p 42 ./deploy/
```

You can also just write the package.xml and destructiveChanges.xml by passing the -d flag

```
sfpackage destinationBranch sourceBranch -d > ~/Desktop/packageAndDestructiveChanges.xml
```

You can also create "backout" content by reversing the order of the destination and source branches

```
sfpackage sourceBranch destinationBranch ./deploy/
```


