const fs = require("fs");

const rawdata = fs.readFileSync("provisioning-template.js");
const template = JSON.parse(rawdata);
const stage = process.env.STAGE || 'dev';

template.templateBody.Resources.policy.Properties.PolicyDocument = JSON.stringify(
  template.templateBody.Resources.policy.Properties.PolicyDocument
);
template.templateBody.Resources.thing.Properties.AttributePayload = { stage };
console.log(template.roleArn)
template.roleArn = process.env.JITP_ROLE_ARN;
template.templateBody = JSON.stringify(template.templateBody);
fs.writeFileSync("provisioning-template.json", JSON.stringify(template));
