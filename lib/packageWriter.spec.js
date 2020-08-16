const assert = require('assert');
const {packageWriter} = require('./packageWriter');

describe('packageWriter', function () {
    it('writes XML', () => {
        const testMetaData = {
            classes: ['TestController', 'TestExtension'],
            pages: ['AReallyCoolPage']
        };

        const generatedXML = packageWriter(testMetaData, 42);
        assert.strictEqual(generatedXML, `<?xml version="1.0"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
  <types>
    <members>TestController</members>
    <members>TestExtension</members>
    <name>ApexClass</name>
  </types>
  <types>
    <members>AReallyCoolPage</members>
    <name>ApexPage</name>
  </types>
  <version>42</version>
</Package>`);
    });
});
