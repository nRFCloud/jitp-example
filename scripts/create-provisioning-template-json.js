const fs = require('fs');
const tmp = require('tmp');
const { template } = require('./provisioning-template.js');

const roleArn = process.env.JITP_ROLE_ARN;
const stage = process.env.STAGE || 'dev';
const thingGroup = process.env.PROVISIONED_THING_GROUP;
const thingType = process.env.JITP_THING_TYPE || 'jitp';

const tmpFile = tmp.fileSync();

fs.writeFileSync(tmpFile.name, JSON.stringify(template({
  roleArn,
  stage,
  thingType,
  thingGroup,
})));

process.stdout.write(tmpFile.name);
