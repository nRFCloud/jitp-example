const fs = require('fs');
const tmp = require('tmp');
const { template } = require('./provisioning-template.js');

const policyName = process.env.JITP_CONNECT_POLICY;
const roleArn = process.env.JITP_ROLE_ARN;
const stage = process.env.STAGE || 'dev';

const tmpFile = tmp.fileSync();

fs.writeFileSync(tmpFile.name, JSON.stringify(template({
  policyName,
  roleArn,
  stage,
})));

process.stdout.write(tmpFile.name);
